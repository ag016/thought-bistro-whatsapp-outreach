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
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (parts) {
    const [, d, m, y, h, min, s] = parts;
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  try { return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return str; }
}

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
    const newCurrentStep = Math.max(lead.current_step, stepNumber);
    setLead(prev => prev ? { ...prev, current_step: newCurrentStep, last_sent_at: now } : prev);
    setNurtureRaw(prev => ({ ...prev, current_step: String(newCurrentStep), last_sent_at: now, [`msg${stepNumber}_sent`]: now }));
    setAwaitSentMsg(null);
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, currentStep: newCurrentStep, lastSentAt: now, msgIndex: stepNumber, sentAt: now })
    });
  };

  const handlePause = async () => {
    if (!lead) return;
    const newStatus = lead.status === 'paused' ? 'active' : 'paused';
    setLead(prev => prev ? { ...prev, status: newStatus } : prev);
    setNurtureRaw(prev => ({ ...prev, status: newStatus }));
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!lead) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--accent-color)', gap: 12 }}>
      <div style={{ fontSize: 40 }}>404</div>
      <div>Lead not found</div>
      <button onClick={() => router.push('/')} className="btn-primary" style={{ marginTop: 8, padding: '10px 20px' }}>Back to Dashboard</button>
    </div>
  );

  const isCompleted = lead.current_step >= NURTURE_SEQUENCE.length;
  const daysUntil   = getDaysUntilDue(lead);
  const m           = lead.metadata;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', paddingBottom: 60 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .detail-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media(min-width: 1100px) { .detail-grid { grid-template-columns: 300px 1fr 320px; } }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pane-card { 
          background: var(--surface-color); 
          border: 1px solid var(--border-color); 
          border-radius: 18px; 
          padding: 20px; 
          height: fit-content;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pane-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .input-field {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--text-color);
          font-size: 13px;
          transition: border-color 0.2s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--accent-color);
        }
        .btn-primary {
          background: var(--accent-color);
          color: var(--bg-color);
          font-weight: 700;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .chat-bubble {
          padding: 12px;
          border-radius: 12px;
          font-size: 12px;
          line-height: 1.5;
          transition: background 0.2s ease;
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-color)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-color)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/')} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--accent-color)', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700, transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-color)' }}>{lead.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6 }}>{lead.company_name || 'No company'} · {lead.phone_number}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handlePause} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: lead.status === 'paused' ? 'var(--accent-color)' : 'var(--text-color)', opacity: lead.status === 'paused' ? 1 : 0.6, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease' }}>
            {lead.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div className="detail-grid">

          {/* ── LEFT PANEL: Lead Info & Identity ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 14 }}>NURTURE PROGRESS</div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                {NURTURE_SEQUENCE.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < lead.current_step ? 'var(--accent-color)' : i === lead.current_step && !isCompleted ? 'rgba(var(--accent-color), 0.35)' : 'var(--border-color)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-color)', fontWeight: 700 }}>Step {Math.min(lead.current_step + 1, 10)} / 10</span>
                {isCompleted
                  ? <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>Sequence complete</span>
                  : daysUntil <= 0
                    ? <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>Due now</span>
                    : <span style={{ color: 'var(--text-color)', opacity: 0.6 }}>Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>}
              </div>
              {lead.last_sent_at && (
                <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.4, marginTop: 6 }}>Last sent: {fmt(lead.last_sent_at)}</div>
              )}
            </div>

            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 14 }}>LEAD INFO</div>
              <div className="meta-grid">
                {m.clinic_type     && <InfoField label="Clinic Type"   value={m.clinic_type} />}
                {m.treatment_price && <InfoField label="Avg Price"      value={`Rs. ${m.treatment_price}`} />}
                {m.platform        && <InfoField label="Platform"       value={m.platform} />}
                {m.campaign_name   && <InfoField label="Campaign"       value={m.campaign_name} />}
                {m.ad_name         && <InfoField label="Ad"             value={m.ad_name} />}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5, marginBottom: 6, fontWeight: 600 }}>SHEET STATUS (QUALIFICATION)</div>
                <select 
                  value={m.lead_status || 'CREATED'} 
                  onChange={e => handleUpdateStatus(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="CREATED">CREATED</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Not Qualified">Not Qualified</option>
                </select>
              </div>

              <InfoField label="Submitted" value={fmt(m.india_time || lead.created_at)} fullWidth />

              {m.lead_quality_desc && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.7, marginBottom: 6, fontWeight: 700 }}>CURRENT LEAD SITUATION</div>
                  <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.9, lineHeight: 1.6 }}>{m.lead_quality_desc}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER PANEL: Message Timeline ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 16 }}>MESSAGE TIMELINE</div>
              <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6, marginBottom: 20 }}>
                You can send messages continuously or skip ahead. Timestamps are tracked individually.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {NURTURE_SEQUENCE.map((step, i) => {
                  const sentTimestamp = nurtureRaw[`msg${step.step_number}_sent`];
                  const hasBeenSent = !!sentTimestamp;
                  const isCurrentTarget = !hasBeenSent && i === lead.current_step && !isCompleted;
                  const daysFromNow = Math.max(0, step.day_offset - Math.ceil((Date.now() - new Date(lead.created_at).getTime()) / 86400000));
                  const waLink = generateWhatsAppLink(lead.phone_number, step.message_text);

                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: i < NURTURE_SEQUENCE.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 14, background: hasBeenSent ? 'var(--accent-color)' : isCurrentTarget ? 'rgba(var(--accent-color), 0.5)' : 'var(--border-color)', border: isCurrentTarget ? '2px solid var(--accent-color)' : 'none' }} />
                        {i < NURTURE_SEQUENCE.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 40, background: hasBeenSent ? 'rgba(var(--accent-color), 0.2)' : 'var(--border-color)', margin: '4px 0' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, paddingTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: hasBeenSent ? 'var(--text-color)' : isCurrentTarget ? 'var(--accent-color)' : 'var(--text-color)', opacity: hasBeenSent || isCurrentTarget ? 1 : 0.5 }}>
                            Message {step.step_number}
                            {isCurrentTarget && ' — Next Expected'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.5, textAlign: 'right' }}>
                            Day {step.day_offset}
                          </div>
                        </div>

                        {hasBeenSent && sentTimestamp && (
                          <div style={{ fontSize: 11, color: 'var(--accent-color)', opacity: 0.8, marginBottom: 8 }}>✓ Sent on {fmt(sentTimestamp)}</div>
                        )}
                        {!hasBeenSent && !isCurrentTarget && (
                          <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.4, marginBottom: 8 }}>
                            {daysFromNow > 0 ? `Ideally in ${daysFromNow} day{daysFromNow !== 1 ? 's' : ''}` : 'Pending'}
                          </div>
                        )}

                        <div className="chat-bubble" style={{ background: hasBeenSent ? 'rgba(var(--accent-color), 0.05)' : 'var(--bg-color)', color: 'var(--text-color)', opacity: hasBeenSent ? 1 : 0.7, borderLeft: `3px solid ${hasBeenSent ? 'var(--accent-color)' : 'var(--border-color)'}` }}>
                          <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{step.message_text}</pre>
                        </div>

                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          {awaitSentMsg === step.step_number ? (
                            <button onClick={() => handleMarkMsgSent(step.step_number)} className="btn-primary" style={{ flex: 1, padding: '10px 0' }}>
                              Click to confirm sending
                            </button>
                          ) : (
                            <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => setAwaitSentMsg(step.step_number)}
                              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center', textDecoration: 'none', display: 'block', background: hasBeenSent ? 'var(--surface-color)' : 'var(--accent-color)', color: hasBeenSent ? 'var(--accent-color)' : 'var(--bg-color)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease' }}>
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

          {/* ── RIGHT PANEL: Action Center ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', letterSpacing: '0.08em', marginBottom: 14 }}>NOTES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
                {notes.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.4, fontStyle: 'italic' }}>No notes yet.</div>
                ) : (
                  notes.map((note, i) => (
                    <div key={i} style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: 12, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#fef08a', lineHeight: 1.5, marginBottom: 6 }}>{note.note_text}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5 }}>
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
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={handleAddNote} 
                  disabled={addingNote || !newNote.trim()}
                  className="btn-primary"
                  style={{ padding: '0 16px', background: '#eab308', color: '#422006' }}>
                  Add
                </button>
              </div>
            </div>

            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', marginBottom: 14 }}>BOOK APPOINTMENT</div>
              {session && (session as any).accessToken ? (
                <>
                  <input type="text" placeholder="Event Title (e.g. Discovery Call)" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="input-field" style={{ width: '100%', marginBottom: 12 }} />
                  <input type="text" placeholder="Appointment Note" value={eventNote} onChange={e => setEventNote(e.target.value)} className="input-field" style={{ width: '100%', marginBottom: 12 }} />
                  <input type="datetime-local" value={callDate} onChange={e => setCallDate(e.target.value)} className="input-field" style={{ width: '100%', marginBottom: 12, colorScheme: 'dark' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleBookCall} disabled={booking || !callDate} className="btn-primary" style={{ flex: 1, padding: '12px', background: booking ? '#1e3a8a' : '#2563eb', color: '#fff' }}>
                      {booking ? 'Scheduling...' : bookSuccess ? '✓ ' + bookSuccess : 'Add to Google Calendar'}
                    </button>
                    <button onClick={handleDeleteEvent} style={{ padding: '12px', borderRadius: 10, background: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d', cursor: 'pointer', fontSize: 18, transition: 'all 0.2s ease' }}>🗑</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6 }}>Sign in to Google on your Dashboard to enable 1-tap scheduling here.</div>
                </div>
              )}
            </div>

            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 14 }}>QUICK TEMPLATES</div>
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
                        background: 'var(--bg-color)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--text-color)', 
                        fontSize: 13, 
                        fontWeight: 600, 
                        textDecoration: 'none', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      {tpl.name}
                      <span style={{ fontSize: 16 }}>↗</span>
                    </a>
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
