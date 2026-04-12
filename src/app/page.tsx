'use client';

import { useState, useEffect, useCallback } from 'react';
import { calculateIsDue, generateWhatsAppLink, NURTURE_SEQUENCE } from '@/lib/nurture';

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

interface SheetLead {
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  created_at: string;
  metadata: Lead['metadata'];
}

interface NurtureEntry {
  current_step: number;
  status: LeadStatus;
  last_sent_at: string | null;
}

type NurtureMap = Record<string, NurtureEntry>;

// ── Constants ─────────────────────────────────────────────────────────────────

const CORRECT_PIN = '1234';
const NURTURE_KEY = 'tb_nurture_v2';
const AUTH_KEY    = 'tb_auth_session';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNurtureMap(): NurtureMap {
  try { return JSON.parse(localStorage.getItem(NURTURE_KEY) ?? '{}') as NurtureMap; }
  catch { return {}; }
}

function saveNurtureMap(map: NurtureMap) {
  localStorage.setItem(NURTURE_KEY, JSON.stringify(map));
}

function mergeLeads(sheetLeads: SheetLead[], nurtureMap: NurtureMap): Lead[] {
  return sheetLeads
    .filter(sl => sl.full_name || sl.phone_number)
    .map(sl => {
      const nurture = nurtureMap[sl.sheet_id] ?? { current_step: 0, status: 'active' as LeadStatus, last_sent_at: null };
      return { id: sl.sheet_id, sheet_id: sl.sheet_id, full_name: sl.full_name, phone_number: sl.phone_number, company_name: sl.company_name, created_at: sl.created_at, metadata: sl.metadata, ...nurture } as Lead;
    })
    .reverse(); // LIFO — newest leads (bottom of sheet) appear first
}

function formatDate(str: string) {
  try {
    return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return str; }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function App() {
  const [authed,       setAuthed]       = useState(false);
  const [pin,          setPin]          = useState('');
  const [pinShake,     setPinShake]     = useState(false);
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [tab,          setTab]          = useState<'due' | 'all'>('due');
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [awaitingSent, setAwaitingSent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      const res  = await fetch('/api/leads');
      const data = await res.json() as { leads?: SheetLead[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch leads');
      setLeads(mergeLeads(data.leads ?? [], getNurtureMap()));
    } catch (e) { setApiError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadLeads(); }, [authed, loadLeads]);

  const handleSync = async () => { setSyncing(true); await loadLeads(); setSyncing(false); };

  const inputPin = (d: string) => {
    const next = pin + d; setPin(next);
    if (next.length === 4) {
      if (next === CORRECT_PIN) { sessionStorage.setItem(AUTH_KEY, '1'); setAuthed(true); }
      else { setPinShake(true); setTimeout(() => { setPin(''); setPinShake(false); }, 700); }
    }
  };

  const deletePin = () => setPin(p => p.slice(0, -1));

  const handleSend     = (id: string) => setAwaitingSent(id);
  const handleMarkSent = (id: string) => {
    const map = getNurtureMap(); const lead = leads.find(l => l.id === id); if (!lead) return;
    const entry = map[id] ?? { current_step: lead.current_step, status: lead.status, last_sent_at: null };
    const nextStep = Math.min(entry.current_step + 1, NURTURE_SEQUENCE.length);
    map[id] = { ...entry, current_step: nextStep, last_sent_at: new Date().toISOString() };
    saveNurtureMap(map);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, current_step: nextStep, last_sent_at: map[id].last_sent_at } : l));
    setAwaitingSent(null);
  };
  const handlePause = (id: string) => {
    const map = getNurtureMap(); const lead = leads.find(l => l.id === id); if (!lead) return;
    const entry = map[id] ?? { current_step: lead.current_step, status: lead.status, last_sent_at: lead.last_sent_at };
    const newStatus = entry.status === 'paused' ? 'active' : 'paused';
    map[id] = { ...entry, status: newStatus };
    saveNurtureMap(map);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const dueLeads     = leads.filter(l => calculateIsDue(l));
  const displayLeads = tab === 'due' ? dueLeads : leads;

  if (!authed) return <PinScreen pin={pin} shake={pinShake} onInput={inputPin} onDelete={deletePin} />;

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', paddingBottom: 80 }}>
      <style>{`
        .stats-grid   { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .leads-grid   { display:grid; grid-template-columns:1fr; gap:16px; }
        @media(min-width:768px)  { .stats-grid { grid-template-columns:repeat(4,1fr); } .leads-grid { grid-template-columns:1fr 1fr; } }
        @media(min-width:1280px) { .leads-grid { grid-template-columns:1fr 1fr 1fr; } }
      `}</style>

      {/* ── Sticky Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,13,6,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a2e1a', padding: '14px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#ecfdf5', letterSpacing: '-0.3px' }}>Thought Bistro</span>
            <span style={{ fontSize: 12, color: '#25D366', marginLeft: 10 }}>Lead Machine · {leads.length} leads loaded</span>
          </div>
          <button onClick={handleSync} disabled={syncing || loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#0d1a0d', border: '1px solid #1a2e1a', color: '#25D366', fontSize: 13, fontWeight: 600, cursor: syncing || loading ? 'not-allowed' : 'pointer', opacity: syncing || loading ? 0.5 : 1 }}>
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>⟳</span>
            {syncing ? 'Syncing…' : 'Sync Sheet'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* ── Stats Bar ── */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <StatCard label="Total Leads"  value={leads.length} />
          <StatCard label="Due Today"    value={dueLeads.length} accent />
          <StatCard label="Active"       value={leads.filter(l => l.status === 'active').length} />
          <StatCard label="Paused"       value={leads.filter(l => l.status === 'paused').length} />
        </div>

        {/* ── API Error ── */}
        {apiError && (
          <div style={{ background: '#1a0a0a', border: '1px solid #5a1a1a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#ff8080' }}>
            <strong>⚠️ Error:</strong> {apiError}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 14, padding: 4, marginBottom: 20, maxWidth: 400 }}>
          {(['due', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', background: tab === t ? '#25D366' : 'transparent', color: tab === t ? '#060d06' : '#5a8a5a' }}>
              {t === 'due' ? `Due Today (${dueLeads.length})` : `All Leads (${leads.length})`}
            </button>
          ))}
        </div>

        {/* ── Lead Grid ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#5a8a5a' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading leads from Google Sheets…
          </div>
        ) : displayLeads.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="leads-grid" style={{ paddingBottom: 24 }}>
            {displayLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                awaitingSent={awaitingSent === lead.id}
                onSend={handleSend}
                onMarkSent={handleMarkSent}
                onPause={handlePause}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(6,13,6,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid #1a2e1a', padding: '12px 0 20px', display: 'flex', justifyContent: 'space-around' }}>
        {[{ icon: '🏠', label: 'Dashboard', active: true }, { icon: '📊', label: 'Analytics' }, { icon: '⚙️', label: 'Settings' }].map(item => (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: item.active ? '#25D366' : '#3a5a3a' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead, awaitingSent, onSend, onMarkSent, onPause }: {
  lead: Lead; awaitingSent: boolean;
  onSend: (id: string) => void; onMarkSent: (id: string) => void; onPause: (id: string) => void;
}) {
  const isDue       = calculateIsDue(lead);
  const isActive    = lead.status === 'active';
  const isCompleted = lead.current_step >= NURTURE_SEQUENCE.length;
  const stepIdx     = Math.min(lead.current_step, NURTURE_SEQUENCE.length - 1);
  const stepData    = NURTURE_SEQUENCE[stepIdx];
  const canSend     = isDue && isActive && !isCompleted;
  const waLink      = generateWhatsAppLink(lead.phone_number, stepData.message_text);
  const m           = lead.metadata;

  return (
    <div className="animate-fade-in" style={{ background: '#0d1a0d', border: `1px solid ${lead.status === 'paused' ? '#2d1f0a' : canSend ? '#25D36635' : '#1a2e1a'}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: canSend ? '0 0 28px rgba(37,211,102,0.07)' : 'none' }}>

      {/* ── Card Header ── */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#ecfdf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.full_name || 'Unknown Lead'}</div>
            <div style={{ fontSize: 12, color: '#5a8a5a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name || '—'}</div>
            <div style={{ fontSize: 11, color: '#3a5a3a', marginTop: 2 }}>📞 {lead.phone_number}</div>
          </div>
          <StatusBadge status={lead.status} isDue={isDue} isCompleted={isCompleted} />
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
          {NURTURE_SEQUENCE.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < lead.current_step ? '#25D366' : i === lead.current_step && !isCompleted ? 'rgba(37,211,102,0.35)' : '#1a2e1a' }} />
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#3a5a3a' }}>
          Step {Math.min(lead.current_step + 1, 10)}/10 · Day {stepData.day_offset}
          {lead.last_sent_at && <span style={{ marginLeft: 8, color: '#2a4a2a' }}>· Last sent {formatDate(lead.last_sent_at)}</span>}
        </div>
      </div>

      {/* ── Lead Intel ── */}
      <div style={{ margin: '0 12px', background: '#0a150a', borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 8 }}>LEAD INTEL</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {m.clinic_type && (
            <InfoRow icon="🏥" label="Clinic Type" value={m.clinic_type} />
          )}
          {m.treatment_price && (
            <InfoRow icon="💰" label="Avg Price" value={`₹${m.treatment_price}`} />
          )}
          {m.platform && (
            <InfoRow icon="📱" label="Platform" value={m.platform} />
          )}
          {m.lead_status && (
            <InfoRow icon="📋" label="Sheet Status" value={m.lead_status} />
          )}
        </div>

        {m.lead_quality_desc && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a2e1a' }}>
            <div style={{ fontSize: 10, color: '#4a7a4a', marginBottom: 3 }}>CURRENT LEAD SITUATION</div>
            <div style={{ fontSize: 12, color: '#8ab48a', lineHeight: 1.5 }}>{m.lead_quality_desc}</div>
          </div>
        )}

        {m.notes && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a2e1a' }}>
            <div style={{ fontSize: 10, color: '#4a7a4a', marginBottom: 3 }}>NOTES</div>
            <div style={{ fontSize: 12, color: '#8ab48a', lineHeight: 1.5 }}>{m.notes}</div>
          </div>
        )}

        {(m.ad_name || m.campaign_name) && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1a2e1a', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {m.campaign_name && <MiniChip label={`📢 ${m.campaign_name}`} />}
            {m.ad_name       && <MiniChip label={`🎯 ${m.ad_name}`} />}
          </div>
        )}

        {(m.india_time || lead.created_at) && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#2a4a2a' }}>
            ⏰ Submitted: {formatDate(m.india_time || lead.created_at)}
          </div>
        )}
      </div>

      {/* ── Message Preview ── */}
      {!isCompleted && (
        <div style={{ margin: '0 12px 10px', background: '#071007', borderRadius: 10, padding: '10px 12px', borderLeft: '3px solid #25D36640' }}>
          <div style={{ fontSize: 10, color: '#4a7a4a', marginBottom: 4 }}>MESSAGE {stepData.step_number} PREVIEW</div>
          <div style={{ fontSize: 12, color: '#4a6a4a', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {stepData.message_text}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ padding: '0 12px 14px', marginTop: 'auto' }}>
        {isCompleted ? (
          <div style={{ textAlign: 'center', padding: '12px 0', color: '#25D366', fontSize: 13, fontWeight: 700 }}>✅ Sequence complete</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {awaitingSent ? (
              <button onClick={() => onMarkSent(lead.id)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '2px solid #25D366', background: 'rgba(37,211,102,0.10)', color: '#25D366', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                ✓ Mark as Sent
              </button>
            ) : (
              <a href={canSend ? waLink : undefined} target={canSend ? '_blank' : undefined} rel="noopener noreferrer"
                onClick={() => canSend && onSend(lead.id)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: canSend ? '#25D366' : '#1a2e1a', color: canSend ? '#060d06' : '#3a5a3a', fontWeight: 700, fontSize: 13, cursor: canSend ? 'pointer' : 'default' }}>
                {canSend ? `Send Msg ${stepData.step_number} →` : lead.status === 'paused' ? '⏸ Paused' : `Wait · Day ${stepData.day_offset}`}
              </a>
            )}
            <button onClick={() => onPause(lead.id)} title={lead.status === 'paused' ? 'Resume' : 'Pause'} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #1a2e1a', background: lead.status === 'paused' ? 'rgba(37,211,102,0.1)' : '#1a2e1a', color: lead.status === 'paused' ? '#25D366' : '#5a8a5a', fontSize: 18, cursor: 'pointer' }}>
              {lead.status === 'paused' ? '▶' : '⏸'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#3a5a3a', marginBottom: 1 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, color: '#8ab48a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function MiniChip({ label }: { label: string }) {
  return <span style={{ padding: '2px 8px', borderRadius: 20, background: '#0d1a0d', color: '#3a5a3a', fontSize: 11, border: '1px solid #1a2e1a' }}>{label}</span>;
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: accent ? '#25D366' : '#0d1a0d', border: `1px solid ${accent ? 'transparent' : '#1a2e1a'}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent ? '#06280a' : '#5a8a5a', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ? '#06280a' : '#ecfdf5' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status, isDue, isCompleted }: { status: string; isDue: boolean; isCompleted: boolean }) {
  if (status === 'paused') return <span style={{ padding: '4px 10px', borderRadius: 20, background: '#2d1f0a', color: '#f59e0b', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>⏸ Paused</span>;
  if (isCompleted)         return <span style={{ padding: '4px 10px', borderRadius: 20, background: '#0d1a2e', color: '#60a5fa', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>✓ Done</span>;
  if (isDue)               return <span style={{ padding: '4px 10px', borderRadius: 20, background: '#0a2612', color: '#25D366', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>● Due</span>;
  return                   <span style={{ padding: '4px 10px', borderRadius: 20, background: '#1a1a1a', color: '#3a5a3a', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>Pending</span>;
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#5a8a5a' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{tab === 'due' ? '🎉' : '📭'}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#ecfdf5', marginBottom: 6 }}>{tab === 'due' ? 'All caught up!' : 'No leads yet'}</div>
      <div style={{ fontSize: 13 }}>{tab === 'due' ? 'No leads due for messaging today.' : 'Press Sync to load leads from Google Sheets.'}</div>
    </div>
  );
}

// ── PIN Screen ────────────────────────────────────────────────────────────────

const NUMPAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

function PinScreen({ pin, shake, onInput, onDelete }: { pin: string; shake: boolean; onInput: (d: string) => void; onDelete: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
      <div style={{ width: '100%', maxWidth: 280 }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 18px', boxShadow: '0 8px 32px rgba(37,211,102,0.25)' }}>💬</div>
          <div style={{ fontSize: 23, fontWeight: 800, color: '#ecfdf5', letterSpacing: '-0.3px' }}>Thought Bistro</div>
          <div style={{ fontSize: 13, color: '#5a8a5a', marginTop: 4 }}>Lead Machine</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 8, animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? '#25D366' : 'transparent', border: `2px solid ${shake ? '#ef4444' : i < pin.length ? '#25D366' : '#1a2e1a'}`, transition: 'all 0.15s', boxShadow: i < pin.length ? '0 0 8px rgba(37,211,102,0.4)' : 'none' }} />)}
        </div>
        <div style={{ height: 22, textAlign: 'center', marginBottom: 20 }}>
          {shake && <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>Incorrect PIN. Try again.</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {NUMPAD.flat().map((d, i) => (
            <button key={i} onClick={() => d === '⌫' ? onDelete() : d !== '' ? onInput(d) : undefined}
              style={{ height: 64, borderRadius: 18, border: d === '' ? 'none' : '1px solid #1a2e1a', background: d === '' ? 'transparent' : '#0d1a0d', color: d === '⌫' ? '#5a8a5a' : '#ecfdf5', fontSize: d === '⌫' ? 22 : 24, fontWeight: 600, cursor: d === '' ? 'default' : 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
