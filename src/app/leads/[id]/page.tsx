'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) !== '1') {
      router.push('/');
    }
  }, [router]);

  const loadLead = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, nurtureRes, notesRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/nurture'),
        fetch(`/api/notes?leadId=${encodeURIComponent(params.id)}`)
      ]);
      const leadsData   = await leadsRes.json() as { leads?: any[] };
      const nurtureData = await nurtureRes.json() as { nurture?: Record<string, Record<string, string>> };
      const notesData   = await notesRes.json() as { notes?: Note[] };

      const paramId = decodeURIComponent(params.id);
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
                    <div key={i} style={{ background: '#1a1a0f', border: '1px solid #2d2d1f', borderRadius: 12, padding: '12px' }}>
                      <div style={{ fontSize: 13, color: '#fef08a', lineHeight: 1.5, marginBottom: 6 }}>{note.note_text}</div>
                      <div style={{ fontSize: 10, color: '#a1a1aa' }}>
                        {note.source === 'imported' ? 'Imported from Sheet' : fmt(note.created_at)}
                      </div>
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

            {/* Lead Info */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 14 }}>LEAD INFO</div>
              <div className="meta-grid">
                {m.clinic_type     && <InfoField label="Clinic Type"   value={m.clinic_type} />}
                {m.treatment_price && <InfoField label="Avg Price"      value={`Rs. ${m.treatment_price}`} />}
                {m.platform        && <InfoField label="Platform"       value={m.platform} />}
                {m.lead_status     && <InfoField label="Sheet Status"   value={m.lead_status} />}
                {m.campaign_name   && <InfoField label="Campaign"       value={m.campaign_name} />}
                {m.ad_name         && <InfoField label="Ad"             value={m.ad_name} />}
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
