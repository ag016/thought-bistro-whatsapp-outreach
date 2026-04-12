'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NURTURE_SEQUENCE, generateWhatsAppLink, getDaysUntilDue } from '@/lib/nurture';
import InfoField from './InfoField';

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadStatus = 'active' | 'paused' | 'converted' | 'completed';

interface Lead {
  id: string;
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  current_step: number;
  status: LeadStatus;
  last_sent_at: string | null;
  created_at: string;
  metadata: {
    clinic_type: string;
    treatment_price: string;
    lead_quality_desc: string;
    notes: string;
    ad_name: string;
    campaign_name: string;
    platform: string;
    india_time: string;
    lead_status: string;
  };
}

interface Note {
  lead_id: string;
  note_text: string;
  created_at: string;
  source: string;
}

const AUTH_KEY = 'tb_auth_session';

// ── Templates ─────────────────────────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  {
    id: 'starter',
    name: 'Starter Capacity',
    text: `Hi [NAME], great speaking with you! 

I'm excited to get started on building your patient acquisition engine with our Starter Capacity setup (₹60,000/campaign). 

Our singular focus with this build is *Lead Quality*. We don't chase vanity metrics, fluff, or empty clicks; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book. For this campaign, we handle all the heavy lifting to make that happen, which includes:
* 1 Dedicated Ad Set
* 2 Authority Video Ads
* Complete Tech Setup & Lead Forms
Note: Our ongoing support fee of ₹15,000/month per campaign is completely waived for your first month.

Since your Skin Tightening Treatment using the Hifu Laser starts at ₹25,000, we are backing this with our strict Skin-in-the-Game Guarantee. As long as you allocate a minimum of ₹30,000 to ad spend for the month, we guarantee to deliver at least 3 highly qualified leads in your first month to fully justify and cover your investment with us. 

Please note that this guarantee is adjusted based on the offer you take up. For example, in case you take our Growth Capacity offer (₹1,75,000/campaign), then on a minimum ad spend of ₹1.5L for the month, we will guarantee you at least 7 qualified leads to cover that investment.

If we miss the mark on your chosen tier: 
You either do not owe us the final 50% (if you choose the split payment), or we will refund 50% of your investment (if you pay upfront).

For a full breakdown of the deliverables and our other tiers, you can review our pricing page here: https://www.thethoughtbistro.com/pricing

Think over whether you'd prefer to proceed with the 15% discounted upfront payment of ₹51,000 or the 50/50 split of ₹30,000 now and ₹30,000 on launch, and we can finalize everything during our meeting tomorrow!
-Vishrut

P.S. Since we are already guaranteeing the baseline to cover your investment, the only real question left to consider is: do you want more high-quality leads, and exactly how many can your clinic's team realistically handle?`
  },
  {
    id: 'growth',
    name: 'Growth Capacity',
    text: `Hi [NAME], great speaking with you!

I'm excited to get started on building your patient acquisition engine with our Growth Capacity setup (₹1,75,000/campaign). 

Our singular focus is Lead Quality. We don't chase vanity metrics; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book. 

For this build, we handle all the heavy lifting, which includes:
✅ 1 Dedicated Ad Set
✅ 7 Research-Backed Authority Videos (Using a data-driven framework to ensure maximum trust and conversion)
✅ Complete Tech Setup & Lead Forms

Ongoing Management:
To ensure the system stays optimized and leads keep flowing, there is an ongoing support fee of ₹15,000/month per campaign. However, to get us off to a flying start, this fee is completely waived for your first month. 🎁

🛡️ The 'Skin-in-the-Game' Guarantee:
We are backing this with a strict performance guarantee. Given that a qualified lead represents an average of ₹40k in potential business, just 5 qualified leads would generate ₹2,00,000—fully recovering your investment and putting you in the green. 

Therefore, we guarantee you at least 5 highly qualified leads to justify this investment. If we miss that mark: 
👉 You either do not owe us the final 50% (if you choose the split payment), or we will refund 50% of your investment (if you pay upfront).

💰 Investment & Terms:
(All prices are exclusive of GST)

1️⃣ Full Upfront: ₹1,48,750 (15% discount applied)
2️⃣ Split Payment: ₹87,500 now and ₹87,500 on launch

You can view the full breakdown of deliverables and our other tiers on our pricing page here: https://www.thethoughtbistro.com/pricing

Think over which payment option you'd prefer, and we can finalize everything during our meeting tomorrow! 😊

-Vishrut

P.S. Since we are guaranteeing the baseline to cover your investment, the only real question left is: do you want more high-quality leads, and exactly how many can your clinic's team realistically handle? 📈`
  }
];

function fmt(str: string) {
  if (!str) return '—';
  // Handle Indian DD/MM/YYYY HH:MM:SS formatting manually
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (parts) {
    const [, d, m, y, h, min, s] = parts;
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  try { return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return str; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadDetail({ params }: { params: { id: string } }) {
  const router  = useRouter();
  const [lead,         setLead]         = useState<Lead | null>(null);
  const [nurtureRaw,   setNurtureRaw]   = useState<Record<string, string>>({});
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [awaitSentMsg, setAwaitSentMsg] = useState<number | null>(null);
  const [newNote,      setNewNote]      = useState('');
  const [addingNote,   setAddingNote]   = useState(false);
  const [callDate,     setCallDate]     = useState('');
  const [eventTitle,     setEventTitle]     = useState('');
  const [eventNote,      setEventNote]      = useState('');
  const [booking,        setBooking]        = useState(false);
  const [bookSuccess,    setBookSuccess]    = useState('');

  const { data: session } = useSession();

  useEffect(() => {
    const isAuthed = typeof window !== 'undefined' && (sessionStorage.getItem(AUTH_KEY) === '1' || !!session);
    if (!isAuthed) {
      router.push('/');
    }
  }, [router, session]);

  const loadLead = useCallback(async () => {
    setLoading(true);
    try {
      const paramId = decodeURIComponent(params.id);
      const [leadsRes, nurtureRes, notesRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/nurture'),
        fetch(`/api/notes?leadId=${encodeURIComponent(paramId)}`)
      ]);
      const leadsData   = await leadsRes.json() as { leads?: any[] };
      const nurtureData = await nurtureRes.json() as { nurture?: Record<string, Record<string, string>> };
      const notesData   = await notesRes.json() as { notes?: Note[] };
      const found = (leadsData.leads ?? []).find(l => l.sheet_id === paramId || l.id === paramId);
      if (found) {
        const nMap = nurtureData.nurture ?? {};
        const nEntry = nMap[found.sheet_id] ?? {};
        let currentStep = parseInt(nEntry.current_step ?? '0');
        if (isNaN(currentStep)) currentStep = 0;
        
        setLead({
          ...found,
          id: found.sheet_id,
          current_step: currentStep,
          status: nEntry.status || 'active',
          last_sent_at: nEntry.last_sent_at || null
        });
        setNurtureRaw(nEntry);
      }
      setNotes(notesData.notes ?? []);
    } finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const handleMarkMsgSent = async (stepNumber: number) => {
    if (!lead) return;
    const now = new Date().toISOString();
    
    // Auto-advance the sequence if they haven't manually reached this step yet
    const newCurrentStep = Math.max(lead.current_step, stepNumber);
    
    // Optimistic UI update
    setLead(prev => prev ? { ...prev, current_step: newCurrentStep, last_sent_at: now } : prev);
    setNurtureRaw(prev => ({ ...prev, current_step: String(newCurrentStep), last_sent_at: now, [`msg${stepNumber}_sent`]: now }));
    setAwaitSentMsg(null);

    // Persist
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, currentStep: newCurrentStep, lastSentAt: now, msgIndex: stepNumber, sentAt: now })
    });
  };

  const handlePause = async () => {
    if (!lead) return;
    const newStatus = lead.status === 'paused' ? 'active' : 'paused';
    
    // Optimistic UI
    setLead(prev => prev ? { ...prev, status: newStatus } : prev);
    setNurtureRaw(prev => ({ ...prev, status: newStatus }));

    // Persist
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, status: newStatus })
    });
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!lead) return;
    setLead(prev => prev ? { ...prev, metadata: { ...prev.metadata, lead_status: newStatus } } : prev);
    await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, newStatus })
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead) return;
    setAddingNote(true);
    const text = newNote.trim();
    const now = new Date().toISOString();
    
    // Optimistic
    setNotes(prev => [...prev, { lead_id: lead.id, note_text: text, created_at: now, source: 'manual' }]);
    setNewNote('');

    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, noteText: text, createdAt: now })
    });
    setAddingNote(false);
  };

  const handleBookCall = async () => {
    if (!callDate || !lead) return;
    setBooking(true);
    setBookSuccess('');

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadName: lead.full_name, 
          phone: lead.phone_number, 
          dateStr: callDate,
          summary: eventTitle || undefined,
          description: eventNote || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-note
      const noteText = `🗓 Scheduled call for ${new Date(callDate).toLocaleString()} ${eventTitle ? `(${eventTitle})` : ''}`;
      const now = new Date().toISOString();
      setNotes(prev => [...prev, { lead_id: lead.id, note_text: noteText, created_at: now, source: 'system' }]);
      fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, noteText, createdAt: now })
      });

      setBookSuccess('Scheduled!');
      setTimeout(() => setBookSuccess(''), 3000);
      setCallDate('');
      setEventTitle('');
      setEventNote('');
    } catch (e: any) {
      alert(e.message || 'Failed to schedule');
    }
    setBooking(false);
  };

  const handleDeleteNote = async (noteText: string) => {
    if (!lead) return;
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/notes?leadId=${encodeURIComponent(lead.id)}&noteText=${encodeURIComponent(noteText)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes(prev => prev.filter(n => n.note_text !== noteText));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!lead) return;
    if (!confirm('Remove appointment from Google Calendar?')) return;
    try {
      const res = await fetch(`/api/calendar?leadName=${encodeURIComponent(lead.full_name)}&phone=${encodeURIComponent(lead.phone_number)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No matching event found or failed to delete');
      alert('Event removed from calendar');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a8a5a' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!lead) return (
    <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#5a8a5a', gap: 12 }}>
      <div style={{ fontSize: 40 }}>404</div>
      <div>Lead not found</div>
      <button onClick={() => router.push('/')} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 10, background: '#25D366', color: '#060d06', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Back to Dashboard</button>
    </div>
  );

  const isCompleted = lead.current_step >= NURTURE_SEQUENCE.length;
  const daysUntil   = getDaysUntilDue(lead);
  const m           = lead.metadata;

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: '#ecfdf5', paddingBottom: 60 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .detail-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media(min-width: 900px) { .detail-grid { grid-template-columns: 380px 1fr; } }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,13,6,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a2e1a', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/')} style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 10, color: '#25D366', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#ecfdf5' }}>{lead.full_name}</div>
          <div style={{ fontSize: 12, color: '#5a8a5a' }}>{lead.company_name || 'No company'} · {lead.phone_number}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handlePause} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #1a2e1a', background: lead.status === 'paused' ? 'rgba(37,211,102,0.1)' : '#0d1a0d', color: lead.status === 'paused' ? '#25D366' : '#5a8a5a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {lead.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div className="detail-grid">

          {/* ── LEFT PANEL: Lead Info ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Step Progress */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 14 }}>NURTURE PROGRESS</div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                {NURTURE_SEQUENCE.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < lead.current_step ? '#25D366' : i === lead.current_step && !isCompleted ? 'rgba(37,211,102,0.35)' : '#1a2e1a' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#ecfdf5', fontWeight: 700 }}>Step {Math.min(lead.current_step + 1, 10)} / 10</span>
                {isCompleted
                  ? <span style={{ color: '#25D366', fontWeight: 700 }}>Sequence complete</span>
                  : daysUntil <= 0
                    ? <span style={{ color: '#25D366', fontWeight: 700 }}>Due now</span>
                    : <span style={{ color: '#5a8a5a' }}>Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>}
              </div>
              {lead.last_sent_at && (
                <div style={{ fontSize: 11, color: '#3a5a3a', marginTop: 6 }}>Last sent: {fmt(lead.last_sent_at)}</div>
              )}
            </div>

            {/* Notes Section */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', letterSpacing: '0.08em', marginBottom: 14 }}>NOTES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
                {notes.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#3a5a3a', fontStyle: 'italic' }}>No notes yet.</div>
                ) : (
                  notes.map((note, i) => (
                    <div key={i} style={{ background: '#1a1a0f', border: '1px solid #2d2d1f', borderRadius: 12, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#fef08a', lineHeight: 1.5, marginBottom: 6 }}>{note.note_text}</div>
                        <div style={{ fontSize: 10, color: '#a1a1aa' }}>
                          {note.source === 'imported' ? 'Imported from Sheet' : fmt(note.created_at)}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteNote(note.note_text)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>×</button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..." 
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  style={{ flex: 1, background: '#060d06', border: '1px solid #1a2e1a', borderRadius: 10, padding: '10px 14px', color: '#ecfdf5', fontSize: 13 }}
                />
                <button 
                  onClick={handleAddNote} 
                  disabled={addingNote || !newNote.trim()}
                  style={{ padding: '0 16px', borderRadius: 10, background: '#eab308', color: '#422006', fontWeight: 700, border: 'none', cursor: (addingNote || !newNote.trim()) ? 'not-allowed' : 'pointer', opacity: (addingNote || !newNote.trim()) ? 0.5 : 1 }}>
                  Add
                </button>
              </div>
            </div>

            {/* Calendar Section */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', marginBottom: 14 }}>BOOK APPOINTMENT</div>
              {session && (session as any).accessToken ? (
                <>
                  <input type="text" placeholder="Event Title (e.g. Discovery Call)" value={eventTitle} onChange={e => setEventTitle(e.target.value)} style={{ width: '100%', background: '#0a150a', border: '1px solid #1a2e1a', color: '#ecfdf5', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, outline: 'none', colorScheme: 'dark' }} />
                  <input type="text" placeholder="Appointment Note" value={eventNote} onChange={e => setEventNote(e.target.value)} style={{ width: '100%', background: '#0a150a', border: '1px solid #1a2e1a', color: '#ecfdf5', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, outline: 'none', colorScheme: 'dark' }} />
                  <input type="datetime-local" value={callDate} onChange={e => setCallDate(e.target.value)} style={{ width: '100%', background: '#0a150a', border: '1px solid #1a2e1a', color: '#ecfdf5', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12, outline: 'none', colorScheme: 'dark' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleBookCall} disabled={booking || !callDate} style={{ flex: 1, padding: '12px', borderRadius: 10, background: booking ? '#1e3a8a' : '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: booking || !callDate ? 'not-allowed' : 'pointer' }}>
                      {booking ? 'Scheduling...' : bookSuccess ? '✓ ' + bookSuccess : 'Add to Google Calendar'}
                    </button>
                    <button onClick={handleDeleteEvent} style={{ padding: '12px', borderRadius: 10, background: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 12, color: '#5a8a5a' }}>Sign in to Google on your Dashboard to enable 1-tap scheduling here.</div>
                </div>
              )}
            </div>

            {/* Templates Section */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 14 }}>QUICK TEMPLATES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MESSAGE_TEMPLATES.map(tpl => {
                  const personalised = tpl.text.replace('[NAME]', lead.full_name);
                  const waLink = generateWhatsAppLink(lead.phone_number, personalised);
                  return (
                    <a 
                      key={tpl.id} 
                      href={waLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '12px', 
                        borderRadius: 12, 
                        background: '#0a150a', 
                        border: '1px solid #1a2e1a', 
                        color: '#ecfdf5', 
                        fontSize: 13, 
                        fontWeight: 600, 
                        textDecoration: 'none', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#25D366'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1a2e1a'}
                    >
                      {tpl.name}
                      <span style={{ fontSize: 16 }}>↗</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Lead Info */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 14 }}>LEAD INFO</div>
              <div className="meta-grid">
                {m.clinic_type     && <InfoField label="Clinic Type"   value={m.clinic_type} />}
                {m.treatment_price && <InfoField label="Avg Price"      value={`Rs. ${m.treatment_price}`} />}
                {m.platform        && <InfoField label="Platform"       value={m.platform} />}
                {m.campaign_name   && <InfoField label="Campaign"       value={m.campaign_name} />}
                {m.ad_name         && <InfoField label="Ad"             value={m.ad_name} />}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: '#3a5a3a', marginBottom: 6, fontWeight: 600 }}>SHEET STATUS (QUALIFICATION)</div>
                <select 
                  value={m.lead_status || 'CREATED'} 
                  onChange={e => handleUpdateStatus(e.target.value)}
                  style={{ background: '#0a150a', border: '1px solid #1a2e1a', color: '#ecfdf5', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: '100%', cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="CREATED">CREATED</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Not Qualified">Not Qualified</option>
                </select>
              </div>

              <InfoField label="Submitted" value={fmt(m.india_time || lead.created_at)} fullWidth />

              {m.lead_quality_desc && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a2e1a' }}>
                  <div style={{ fontSize: 10, color: '#4a7a4a', marginBottom: 6, fontWeight: 700 }}>CURRENT LEAD SITUATION</div>
                  <div style={{ fontSize: 13, color: '#8ab48a', lineHeight: 1.6 }}>{m.lead_quality_desc}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Flexible Message Timeline ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 16 }}>MESSAGE TIMELINE</div>
              <div style={{ fontSize: 12, color: '#5a8a5a', marginBottom: 20 }}>
                You can send messages continuously or skip ahead. Timestamps are tracked individually.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NURTURE_SEQUENCE.map((step, i) => {
                  // Strict check for whether *this exact* message has been sent
                  const sentTimestamp = nurtureRaw[`msg${step.step_number}_sent`];
                  const hasBeenSent = !!sentTimestamp;
                  
                  // For purely visual indicators
                  const isCurrentTarget = !hasBeenSent && i === lead.current_step && !isCompleted;
                  const daysFromNow = Math.max(0, step.day_offset - Math.ceil((Date.now() - new Date(lead.created_at).getTime()) / 86400000));
                  const waLink = generateWhatsAppLink(lead.phone_number, step.message_text);

                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: i < NURTURE_SEQUENCE.length - 1 ? '1px solid #1a2e1a' : 'none' }}>
                      {/* Timeline dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 14, background: hasBeenSent ? '#25D366' : isCurrentTarget ? 'rgba(37,211,102,0.5)' : '#1a2e1a', border: isCurrentTarget ? '2px solid #25D366' : 'none' }} />
                        {i < NURTURE_SEQUENCE.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 40, background: hasBeenSent ? '#25D36640' : '#1a2e1a', margin: '4px 0' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: hasBeenSent ? '#ecfdf5' : isCurrentTarget ? '#25D366' : '#3a5a3a' }}>
                            Message {step.step_number}
                            {isCurrentTarget && ' — Next Expected'}
                          </div>
                          <div style={{ fontSize: 11, color: '#3a5a3a', textAlign: 'right' }}>
                            Day {step.day_offset}
                          </div>
                        </div>

                        {hasBeenSent && sentTimestamp && (
                          <div style={{ fontSize: 11, color: '#25D36680', marginBottom: 8 }}>✓ Sent on {fmt(sentTimestamp)}</div>
                        )}
                        {!hasBeenSent && !isCurrentTarget && (
                          <div style={{ fontSize: 11, color: '#2a4a2a', marginBottom: 8 }}>
                            {daysFromNow > 0 ? `Ideally in ${daysFromNow} day${daysFromNow !== 1 ? 's' : ''}` : 'Pending'}
                          </div>
                        )}

                        <div style={{ fontSize: 12, color: hasBeenSent ? '#4a7a4a' : '#5a8a5a', lineHeight: 1.5, background: hasBeenSent ? '#0a150a' : '#071007', padding: '12px', borderRadius: 8, borderLeft: `3px solid ${hasBeenSent ? '#25D36630' : '#3a5a3a'}` }}>
                          <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{step.message_text}</pre>
                        </div>

                        {/* Flexible Actions */}
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          {awaitSentMsg === step.step_number ? (
                            <button onClick={() => handleMarkMsgSent(step.step_number)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #25D366', background: 'rgba(37,211,102,0.1)', color: '#25D366', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                              Click to confirm sending
                            </button>
                          ) : (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => setAwaitSentMsg(step.step_number)}
                              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #1a2e1a', textAlign: 'center', textDecoration: 'none', display: 'block', background: hasBeenSent ? '#0d1a0d' : '#25D366', color: hasBeenSent ? '#25D366' : '#060d06', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                              {hasBeenSent ? 'Resend in WhatsApp' : 'Open in WhatsApp'}
                            </a>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
