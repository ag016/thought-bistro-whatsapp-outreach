'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NURTURE_SEQUENCE, generateWhatsAppLink, calculateIsDue, getDaysUntilDue } from '@/lib/nurture';

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

interface NurtureEntry {
  current_step: number;
  status: LeadStatus;
  last_sent_at: string | null;
  sent_history?: { step: number; sent_at: string }[];
}

type NurtureMap = Record<string, NurtureEntry>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const NURTURE_KEY = 'tb_nurture_v2';
const AUTH_KEY    = 'tb_auth_session';

function getNurtureMap(): NurtureMap {
  try { return JSON.parse(localStorage.getItem(NURTURE_KEY) ?? '{}') as NurtureMap; }
  catch { return {}; }
}
function saveNurtureMap(m: NurtureMap) { localStorage.setItem(NURTURE_KEY, JSON.stringify(m)); }

function fmt(str: string) {
  try { return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return str; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadDetail({ params }: { params: { id: string } }) {
  const router  = useRouter();
  const [lead,       setLead]       = useState<Lead | null>(null);
  const [nurture,    setNurture]    = useState<NurtureEntry | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [awaitSent,  setAwaitSent]  = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) !== '1') {
      router.push('/');
    }
  }, [router]);

  const loadLead = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/leads');
      const data = await res.json() as { leads?: Lead[] };
      const found = (data.leads ?? []).find(l => l.sheet_id === params.id || l.id === params.id);
      if (found) {
        const map = getNurtureMap();
        const n   = map[found.sheet_id] ?? { current_step: 0, status: 'active' as LeadStatus, last_sent_at: null, sent_history: [] };
        setLead({ ...found, ...n });
        setNurture(n);
      }
    } finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const handleMarkSent = () => {
    if (!lead || !nurture) return;
    const map   = getNurtureMap();
    const entry = map[lead.sheet_id] ?? { current_step: lead.current_step, status: lead.status, last_sent_at: null, sent_history: [] };
    const now   = new Date().toISOString();
    const history = [...(entry.sent_history ?? []), { step: entry.current_step + 1, sent_at: now }];
    const nextStep = Math.min(entry.current_step + 1, NURTURE_SEQUENCE.length);
    const updated: NurtureEntry = { ...entry, current_step: nextStep, last_sent_at: now, sent_history: history };
    map[lead.sheet_id] = updated;
    saveNurtureMap(map);
    setNurture(updated);
    setLead(prev => prev ? { ...prev, current_step: nextStep, last_sent_at: now } : prev);
    setAwaitSent(false);
  };

  const handlePause = () => {
    if (!lead || !nurture) return;
    const map    = getNurtureMap();
    const entry  = map[lead.sheet_id] ?? nurture;
    const status = entry.status === 'paused' ? 'active' : 'paused';
    map[lead.sheet_id] = { ...entry, status };
    saveNurtureMap(map);
    setNurture(prev => prev ? { ...prev, status } : prev);
    setLead(prev  => prev ? { ...prev, status } : prev);
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

  const isDue       = calculateIsDue(lead);
  const isCompleted = (nurture?.current_step ?? 0) >= NURTURE_SEQUENCE.length;
  const stepIdx     = Math.min(nurture?.current_step ?? 0, NURTURE_SEQUENCE.length - 1);
  const stepData    = NURTURE_SEQUENCE[stepIdx];
  const canSend     = isDue && lead.status === 'active' && !isCompleted;
  const waLink      = generateWhatsAppLink(lead.phone_number, stepData.message_text);
  const daysUntil   = getDaysUntilDue(lead);
  const sentHistory = nurture?.sent_history ?? [];
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
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < (nurture?.current_step ?? 0) ? '#25D366' : i === (nurture?.current_step ?? 0) && !isCompleted ? 'rgba(37,211,102,0.35)' : '#1a2e1a' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#ecfdf5', fontWeight: 700 }}>Step {Math.min((nurture?.current_step ?? 0) + 1, 10)} / 10</span>
                {isCompleted
                  ? <span style={{ color: '#25D366', fontWeight: 700 }}>Sequence complete</span>
                  : canSend
                    ? <span style={{ color: '#25D366', fontWeight: 700 }}>Due now</span>
                    : <span style={{ color: '#5a8a5a' }}>Due in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</span>}
              </div>
              {nurture?.last_sent_at && (
                <div style={{ fontSize: 11, color: '#3a5a3a', marginTop: 6 }}>Last sent: {fmt(nurture.last_sent_at)}</div>
              )}
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

              {m.notes && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a2e1a' }}>
                  <div style={{ fontSize: 10, color: '#4a7a4a', marginBottom: 6, fontWeight: 700 }}>NOTES FROM LEAD</div>
                  <div style={{ fontSize: 13, color: '#8ab48a', lineHeight: 1.6 }}>{m.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Message Timeline ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Current Action */}
            {!isCompleted && (
              <div style={{ background: canSend ? '#0a1f0a' : '#0d1a0d', border: `1px solid ${canSend ? '#25D36650' : '#1a2e1a'}`, borderRadius: 18, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 12 }}>
                  {canSend ? 'SEND NOW — MESSAGE ' + stepData.step_number : 'NEXT MESSAGE — ' + stepData.step_number + ' (in ' + daysUntil + ' days)'}
                </div>
                <div style={{ background: '#060d06', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #25D36640' }}>
                  <pre style={{ fontFamily: 'inherit', fontSize: 13, color: '#8ab48a', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {stepData.message_text}
                  </pre>
                </div>
                {canSend && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {awaitSent ? (
                      <button onClick={handleMarkSent} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '2px solid #25D366', background: 'rgba(37,211,102,0.1)', color: '#25D366', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        Mark as Sent
                      </button>
                    ) : (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={() => setAwaitSent(true)}
                        style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: '#25D366', color: '#060d06', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                        Open in WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message Timeline */}
            <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 18, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 16 }}>MESSAGE TIMELINE</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {NURTURE_SEQUENCE.map((step, i) => {
                  const sentEntry  = sentHistory.find(h => h.step === i + 1);
                  const isSent     = i < (nurture?.current_step ?? 0);
                  const isCurrent  = i === (nurture?.current_step ?? 0) && !isCompleted;
                  const isFuture   = i > (nurture?.current_step ?? 0) || isCompleted && i >= (nurture?.current_step ?? 0);
                  const daysFromNow = Math.max(0, step.day_offset - Math.ceil((Date.now() - new Date(lead.created_at).getTime()) / 86400000));

                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < NURTURE_SEQUENCE.length - 1 ? 0 : 0 }}>
                      {/* Timeline line + dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 14, background: isSent ? '#25D366' : isCurrent ? 'rgba(37,211,102,0.5)' : '#1a2e1a', border: isCurrent ? '2px solid #25D366' : 'none' }} />
                        {i < NURTURE_SEQUENCE.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 24, background: isSent ? '#25D36640' : '#1a2e1a', margin: '4px 0' }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingTop: 8, paddingBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isSent ? '#ecfdf5' : isCurrent ? '#25D366' : '#3a5a3a' }}>
                            Message {step.step_number}
                            {isCurrent && ' — Due Now'}
                          </div>
                          <div style={{ fontSize: 11, color: '#3a5a3a', textAlign: 'right' }}>
                            Day {step.day_offset}
                          </div>
                        </div>

                        {isSent && sentEntry && (
                          <div style={{ fontSize: 11, color: '#25D36680', marginBottom: 6 }}>Sent {fmt(sentEntry.sent_at)}</div>
                        )}
                        {isSent && !sentEntry && (
                          <div style={{ fontSize: 11, color: '#3a5a3a', marginBottom: 6 }}>Sent</div>
                        )}
                        {isCurrent && !isSent && (
                          <div style={{ fontSize: 11, color: '#25D366', marginBottom: 6 }}>Ready to send</div>
                        )}
                        {isFuture && !isCurrent && (
                          <div style={{ fontSize: 11, color: '#2a4a2a', marginBottom: 6 }}>
                            {daysFromNow > 0 ? `In ${daysFromNow} day${daysFromNow !== 1 ? 's' : ''}` : 'Upcoming'}
                          </div>
                        )}

                        <div style={{ fontSize: 12, color: isSent ? '#4a7a4a' : '#2a4a2a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {step.message_text}
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
