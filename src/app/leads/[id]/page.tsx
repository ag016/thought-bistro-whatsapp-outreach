'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NURTURE_SEQUENCE, generateWhatsAppLink, getDaysUntilDue } from '@/lib/nurture';
import InfoField from './InfoField';
import MessageBubble from '@/components/Leads/MessageBubble';
import ActionCenter from '@/components/Leads/ActionCenter';
import { Skeleton } from '@/components/UI/Skeleton';

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
  internal_tag?: string;
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
    text: `Hi [NAME], great speaking with you! \n\nI'm excited to get started on building your patient acquisition engine with our Starter Capacity setup (₹60,000/campaign). \n\nOur singular focus with this build is *Lead Quality*. We don't chase vanity metrics, fluff, or empty clicks; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book. For this campaign, we handle all the heavy lifting to make that happen, which includes:\n* 1 Dedicated Ad Set\n* 2 Authority Video Ads\n* Complete Tech Setup & Lead Forms\nNote: Our ongoing support fee of ₹15,000/month per campaign is completely waived for your first month.\n\nSince your Skin Tightening Treatment using the Hifu Laser starts at ₹25,000, we are backing this with our strict Skin-in-the-Game Guarantee. As long as you allocate a minimum of ₹30,000 to ad spend for the month, we guarantee to deliver at least 3 highly qualified leads in your first month to fully justify and cover your investment with us. \n\nPlease note that this guarantee is adjusted based on the offer you take up. For example, in case you take our Growth Capacity offer (₹1,75,000/campaign), then on a minimum ad spend of ₹1.5L for the month, we will guarantee you at least 7 qualified leads to cover that investment.\n\nIf we miss the mark on your chosen tier: \nYou either do not owe us the final 50% (if you choose the split payment), or we will refund 50% of your investment (if you pay upfront).\n\nFor a full breakdown of the deliverables and our other tiers, you can review our pricing page here: https://www.thethoughtbistro.com/pricing\n\nThink over whether you'd prefer to proceed with the 15% discounted upfront payment of ₹51,000 or the 50/50 split of ₹30,000 now and ₹30,000 on launch, and we can finalize everything during our meeting tomorrow!\n-Vishrut\n\nP.S. Since we are already guaranteeing the baseline to cover your investment, the only real question left to consider is: do you want more high-quality leads, and exactly how many can your clinic's team realistically handle?`
  },
  {
    id: 'growth',
    name: 'Growth Capacity',
    text: `Hi [NAME], great speaking with you!\n\nI'm excited to get started on building your patient acquisition engine with our Growth Capacity setup (₹1,75,000/campaign). \n\nOur singular focus is Lead Quality. We don't chase vanity metrics; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book. \n\nFor this build, we handle all the heavy lifting, which includes:\n✅ 1 Dedicated Ad Set\n✅ 7 Research-Backed Authority Videos (Using a data-driven framework to ensure maximum trust and conversion)\n✅ Complete Tech Setup & Lead Forms\n\nOngoing Management:\nTo ensure the system stays optimized and leads keep flowing, there is an ongoing support fee of ₹15,000/month per campaign. However, to get us off to a flying start, this fee is completely waived for your first month. 🎁\n\n🛡️ The 'Skin-in-the-Game' Guarantee:\nWe are backing this with a strict performance guarantee. Given that a qualified lead represents an average of ₹40k in potential business, just 5 qualified leads would generate ₹2,00,000—fully recovering your investment and putting you in the green. \n\nTherefore, we guarantee you at least 5 highly qualified leads to justify this investment. If we miss that mark: \n👉 You either do not owe us the final 50% (if you choose the split payment), or we will refund 50% of your investment (if you pay upfront).\n\n💰 Investment & Terms:\n(All prices are exclusive of GST)\n\n1️⃣ Full Upfront: ₹1,48,750 (15% discount applied)\n2️⃣ Split Payment: ₹87,500 now and ₹87,500 on launch\n\nYou can view the full breakdown of deliverables and our other tiers on our pricing page here: https://www.thethoughtbistro.com/pricing\n\nThink over which payment option you'd prefer, and we can finalize everything during our meeting tomorrow! 😊\n\n-Vishrut\n\nP.S. Since we are guaranteeing the baseline to cover your investment, the only real question left is: do you want more high-quality leads, and exactly how many can your clinic's team realistically handle? 📈`
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
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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

  const handleUpdateTag = async (newTag: string) => {
    if (!lead) return;
    setLead(prev => prev ? { ...prev, internal_tag: newTag } : prev);
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, internalTag: newTag })
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '24px' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <Skeleton variant="rect" width={40} height={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton variant="text" width={200} />
            <Skeleton variant="text" width={120} />
          </div>
       </div>
       <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr 320px', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton variant="rect" height={120} />
            <Skeleton variant="rect" height={300} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton variant="rect" height={600} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton variant="rect" height={600} />
          </div>
       </div>
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
      {/* Styles moved to globals.css */}


      {/* ── Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-color)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-color)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/')} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--accent-color)', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700, transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>←</button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-color)', opacity: 0.5, marginBottom: 4 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>Dashboard</span>
            <span>›</span>
            <span style={{ color: 'var(--accent-color)' }}>{lead.full_name}</span>
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          <button 
            onClick={() => setLeftCollapsed(!leftCollapsed)} 
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: leftCollapsed ? 'var(--accent-color)' : 'var(--surface-color)', color: leftCollapsed ? 'var(--bg-color)' : 'var(--text-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {leftCollapsed ? 'Show Info' : 'Hide Info'}
          </button>
          <button 
            onClick={() => setRightCollapsed(!rightCollapsed)} 
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: rightCollapsed ? 'var(--accent-color)' : 'var(--surface-color)', color: rightCollapsed ? 'var(--bg-color)' : 'var(--text-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {rightCollapsed ? 'Show Actions' : 'Hide Actions'}
          </button>
        </div>

        <div className="detail-grid">

          {/* ── LEFT PANEL: Lead Info & Identity ── */}
          {!leftCollapsed && (
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
                
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5, marginBottom: 6, fontWeight: 600 }}>INTERNAL TAG</div>
                  <select 
                    value={lead.internal_tag || 'NEW'} 
                    onChange={e => handleUpdateTag(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="NEW">NEW</option>
                    <option value="HOT">HOT</option>
                    <option value="WARM">WARM</option>
                    <option value="COLD">COLD</option>
                    <option value="FOLLOW_UP">FOLLOW UP</option>
                    <option value="CONVERTED">CONVERTED</option>
                  </select>
                </div>

                <div className="meta-grid">
                  {m.platform        && <InfoField label="Platform"       value={m.platform} />}
                  {m.campaign_name   && <InfoField label="Campaign"       value={m.campaign_name} />}
                  {m.ad_name         && <InfoField label="Ad"             value={m.ad_name} />}
                  {m.clinic_type     && <InfoField label="Clinic Type"    value={m.clinic_type} />}
                  {m.treatment_price && <InfoField label="Avg Price"      value={`Rs. ${m.treatment_price}`} />}
                  {m.lead_status     && <InfoField label="Status"         value={m.lead_status} />}
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
          </div>

          {/* ── CENTER PANEL: Message Timeline ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 16 }}>MESSAGE TIMELINE</div>
              <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6, marginBottom: 20 }}>
                Review messages before sending. Click any bubble to edit and confirm.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {NURTURE_SEQUENCE.map((step, i) => {
                  const sentTimestamp = nurtureRaw[`msg${step.step_number}_sent`];
                  const hasBeenSent = !!sentTimestamp;
                  const isCurrentTarget = !hasBeenSent && i === lead.current_step && !isCompleted;
                  
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 14, background: hasBeenSent ? 'var(--accent-color)' : isCurrentTarget ? 'rgba(var(--accent-color), 0.5)' : 'var(--border-color)', border: isCurrentTarget ? '2px solid var(--accent-color)' : 'none' }} />
                        {i < NURTURE_SEQUENCE.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 40, background: hasBeenSent ? 'rgba(var(--accent-color), 0.2)' : 'var(--border-color)', margin: '4px 0' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, paddingTop: 8 }}>
                        <MessageBubble 
                          stepNumber={step.step_number}
                          messageText={step.message_text}
                          hasBeenSent={hasBeenSent}
                          sentTimestamp={sentTimestamp}
                          isCurrentTarget={isCurrentTarget}
                          phoneNumber={lead.phone_number}
                          onMarkSent={handleMarkMsgSent}
                          fmtDate={fmt}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* Simulated System Events for Activity Log */}
                <div className="system-event">
                  <span>Lead created on {fmt(lead.created_at)}</span>
                </div>
                {lead.internal_tag && (
                  <div className="system-event">
                    <span>Tag updated to {lead.internal_tag}</span>
                  </div>
                )}
                {lead.current_step > 0 && (
                  <div className="system-event">
                    <span>Reached Nurture Step {lead.current_step}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: Action Center ── */}
          {!rightCollapsed && (
            <ActionCenter 
              lead={lead}
              notes={notes}
              setNotes={setNotes}
              session={session}
              fmtDate={fmt}
              onAddNote={async (text) => {
                if (!lead) return;
                const now = new Date().toISOString();
                setNotes(prev => [...prev, { lead_id: lead.id, note_text: text, created_at: now, source: 'manual' }]);
                await fetch('/api/notes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ leadId: lead.id, noteText: text, createdAt: now })
                });
              }}
              onDeleteNote={handleDeleteNote}
              onBookCall={async ({ callDate, eventTitle, eventNote }) => {
                if (!lead) return;
                const res = await fetch('/api/calendar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ leadName: lead.full_name, phone: lead.phone_number, dateStr: callDate, summary: eventTitle || undefined, description: eventNote || undefined })
                });
                if (!res.ok) throw new Error('Failed to schedule');
                const noteText = `🗓 Scheduled call for ${new Date(callDate).toLocaleString()} ${eventTitle ? `(${eventTitle})` : ''}`;
                const now = new Date().toISOString();
                setNotes(prev => [...prev, { lead_id: lead.id, note_text: noteText, created_at: now, source: 'system' }]);
                fetch('/api/notes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ leadId: lead.id, noteText, createdAt: now })
                });
              }}
              onDeleteEvent={handleDeleteEvent}
              templates={MESSAGE_TEMPLATES}
            />
          )}

        </div>
      </div>
    </div>
  );
}
