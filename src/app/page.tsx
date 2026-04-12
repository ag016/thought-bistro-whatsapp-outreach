'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateIsDue, generateWhatsAppLink, NURTURE_SEQUENCE } from '@/lib/nurture';
import { useSession, signIn } from 'next-auth/react';
import ViewSwitcher from '@/components/Dashboard/ViewSwitcher';
import KanbanBoard from '@/components/Dashboard/KanbanBoard';
import LeadList from '@/components/Dashboard/LeadList';
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

const CORRECT_PIN = '132103';
const AUTH_KEY    = 'tb_auth_session';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeLeads(sheetLeads: SheetLead[], nurtureMap: NurtureMap): Lead[] {
  return sheetLeads
    .filter(sl => sl.full_name || sl.phone_number)
    .map(sl => {
      const nurture = nurtureMap[sl.sheet_id];
      let currentStep = parseInt(String(nurture?.current_step ?? '0'));
      if (isNaN(currentStep)) currentStep = 0;
      return { id: sl.sheet_id, sheet_id: sl.sheet_id, full_name: sl.full_name, phone_number: sl.phone_number, company_name: sl.company_name, created_at: sl.created_at, metadata: sl.metadata, current_step: currentStep, status: nurture?.status || 'active', last_sent_at: nurture?.last_sent_at || null } as Lead;
    })
    .reverse(); // LIFO — newest leads (bottom of sheet) appear first
}

function formatDate(str: string) {
  if (!str) return '—';
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (parts) {
    const [, d, m, y, h, min, s] = parts;
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  try { return new Date(str).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return str; }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function App() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authed,       setAuthed]       = useState(false);
  const [pin,          setPin]          = useState('');
  const [pinShake,     setPinShake]     = useState(false);
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [tab,          setTab]          = useState<'due' | 'all'>('due');
  const [view,          setView]          = useState<'list' | 'board'>('list');
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [awaitingSent, setAwaitingSent] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      const [leadsRes, nurtureRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/nurture')
      ]);
      const data = await leadsRes.json() as { leads?: SheetLead[]; error?: string };
      const nData = await nurtureRes.json() as { nurture?: NurtureMap };
      if (!leadsRes.ok) throw new Error(data.error ?? 'Failed to fetch leads');
      setLeads(mergeLeads(data.leads ?? [], nData.nurture ?? {}));
    } catch (e) { setApiError(e instanceof Error ? e.message : 'Unknown error'); }
    finally { setLoading(false); }
  }, []);

  const isAccessGranted = authed || !!session;

  useEffect(() => { if (isAccessGranted) loadLeads(); }, [isAccessGranted, loadLeads]);

  const handleSync = async () => { setSyncing(true); await loadLeads(); setSyncing(false); };

  const inputPin = useCallback((d: string) => {
    setPin(prev => {
      if (prev.length >= CORRECT_PIN.length) return prev;
      const next = prev + d;
      if (next.length === CORRECT_PIN.length) {
        if (next === CORRECT_PIN) { sessionStorage.setItem(AUTH_KEY, '1'); setAuthed(true); }
        else { setPinShake(true); setTimeout(() => { setPin(''); setPinShake(false); }, 700); }
      }
      return next;
    });
  }, []);

  const deletePin = () => setPin(p => p.slice(0, -1));

  // Physical keyboard support for PIN screen

  useEffect(() => {
    if (isAccessGranted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputPin(e.key);
      else if (e.key === 'Backspace') deletePin();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authed, inputPin]);

  const handleSend     = (id: string) => setAwaitingSent(id);
  const handleMarkSent = async (id: string) => {
    const lead = leads.find(l => l.id === id); if (!lead) return;
    const nextStep = Math.min(lead.current_step + 1, NURTURE_SEQUENCE.length);
    const now = new Date().toISOString();
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, current_step: nextStep, last_sent_at: now } : l));
    setAwaitingSent(null);

    // Persist
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id, currentStep: nextStep, lastSentAt: now, msgIndex: lead.current_step + 1, sentAt: now })
    });
  };

  const handlePause = async (id: string) => {
    const lead = leads.find(l => l.id === id); if (!lead) return;
    const newStatus = lead.status === 'paused' ? 'active' : 'paused';
    
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));

    // Persist
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id, status: newStatus })
    });
  };

  const handleUpdateTag = async (id: string, tag: string) => {
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, tag })
      });
      if (!res.ok) throw new Error('Failed to update tag');
      
      setLeads(prev => prev.map(l => l.id === id ? { ...l, internal_tag: tag } : l));
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const dueLeads     = leads.filter(l => calculateIsDue(l));
  const displayLeads = tab === 'due' ? dueLeads : leads;

  if (status === 'loading') return null;
  if (!isAccessGranted) return <PinScreen pin={pin} shake={pinShake} onInput={inputPin} onDelete={deletePin} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: 80 }}>
      <style>{`
        .stats-grid   { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(min-width:768px)  { 
          .stats-grid { grid-template-columns:repeat(4,1fr); } 
        }
      `}</style>

      {/* ── Sticky Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'color-mix(in srgb, var(--surface-color), transparent 10%)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', padding: '14px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-color)', letterSpacing: '-0.3px' }}>Thought Bistro</span>
            <span style={{ fontSize: 12, color: 'var(--accent-color)', marginLeft: 10 }}>Lead Machine · {leads.length} leads loaded</span>
          </div>
          <button onClick={handleSync} disabled={syncing || loading} className="transition-enterprise" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', fontSize: 13, fontWeight: 600, cursor: syncing || loading ? 'not-allowed' : 'pointer', opacity: syncing || loading ? 0.5 : 1 }}>
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>⟳</span>
            {syncing ? 'Syncing…' : 'Sync Sheet'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 0', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>

        {/* ── Stats Bar ── */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <StatCard label="Total Leads"  value={leads.length} />
          <StatCard label="Due Today"    value={dueLeads.length} accent />
          <StatCard label="Active"       value={leads.filter(l => l.status === 'active').length} />
          <StatCard label="Paused"       value={leads.filter(l => l.status === 'paused').length} />
        </div>

        {/* ── API Error ── */}
        {apiError && (
          <div style={{ background: 'color-mix(in srgb, var(--surface-color), var(--danger-color) 15%)', border: '1px solid var(--danger-color)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--danger-color)' }}>
            <strong>⚠️ Error:</strong> {apiError}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 14, padding: 4, maxWidth: 400 }}>
            {(['due', 'all'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className="transition-enterprise" style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s', background: tab === t ? 'var(--accent-color)' : 'transparent', color: tab === t ? 'var(--bg-color)' : 'var(--text-color)', opacity: tab === t ? 1 : 0.5 }}>
                {t === 'due' ? `Due Today (${dueLeads.length})` : `All Leads (${leads.length})`}
              </button>
            ))}
          </div>
          <ViewSwitcher view={view} setView={setView} />
        </div>

        {/* ── Lead View ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="stats-grid">
              <Skeleton variant="rect" height={70} />
              <Skeleton variant="rect" height={70} />
              <Skeleton variant="rect" height={70} />
              <Skeleton variant="rect" height={70} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rect" height={80} />
              ))}
            </div>
          </div>
        ) : displayLeads.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div style={{ paddingBottom: 24 }}>
            {view === 'list' ? (
              <LeadList leads={displayLeads} onPause={handlePause} onSend={handleSend} />
            ) : (
              <KanbanBoard leads={displayLeads} onUpdateTag={handleUpdateTag} />
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'color-mix(in srgb, var(--surface-color), transparent 5%)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border-color)', padding: '12px 0 20px', display: 'flex', justifyContent: 'space-around' }}>
        {[
          { icon: '🏠', label: 'Dashboard', path: '/' }, 
          { icon: '📊', label: 'Analytics', path: '/analytics' }, 
          { icon: '⚙️', label: 'Settings', path: '/settings' }
        ].map(item => (
          <div 
            key={item.label} 
            onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: item.path === '/' ? 'var(--accent-color)' : 'var(--text-color)', opacity: item.path === '/' ? 1 : 0.5 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`transition-enterprise ${accent ? '' : 'deep-shadow'}`} style={{ 
      padding: '14px 16px', 
      borderRadius: 16, 
      background: accent ? 'var(--accent-color)' : 'var(--surface-color)', 
      border: `1px solid ${accent ? 'transparent' : 'var(--border-color)'}`,
      boxShadow: accent ? `0 0 25px color-mix(in srgb, var(--accent-color), transparent 60%)` : '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent ? 'var(--bg-color)' : 'var(--text-color)', opacity: accent ? 0.9 : 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ? 'var(--bg-color)' : 'var(--text-color)' }}>{value}</div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--accent-color)' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{tab === 'due' ? '🎉' : '📭'}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-color)', marginBottom: 6 }}>{tab === 'due' ? 'All caught up!' : 'No leads yet'}</div>
      <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.6 }}>{tab === 'due' ? 'No leads due for messaging today.' : 'Press Sync to load leads from Google Sheets.'}</div>
    </div>
  );
}

// ── PIN Screen ────────────────────────────────────────────────────────────────

const NUMPAD = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

function PinScreen({ pin, shake, onInput, onDelete }: { pin: string; shake: boolean; onInput: (d: string) => void; onDelete: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
      <div style={{ width: '100%', maxWidth: 280 }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, background: 'linear-gradient(135deg,var(--accent-color),color-mix(in srgb, var(--accent-color), black 20%))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 18px', boxShadow: `0 8px 32px color-mix(in srgb, var(--accent-color), transparent 75%)` }}>💬</div>
          <div style={{ fontSize: 23, fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.3px' }}>Thought Bistro</div>
          <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.6, marginTop: 4 }}>Lead Machine</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 8, animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}>
          {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? 'var(--accent-color)' : 'transparent', border: `2px solid ${shake ? 'var(--danger-color)' : i < pin.length ? 'var(--accent-color)' : 'var(--border-color)'}`, transition: 'all 0.15s', boxShadow: i < pin.length ? `0 0 8px color-mix(in srgb, var(--accent-color), transparent 60%)` : 'none' }} />)}
        </div>
        <div style={{ height: 22, textAlign: 'center', marginBottom: 20 }}>
          {shake && <span style={{ color: 'var(--danger-color)', fontSize: 12, fontWeight: 600 }}>Incorrect PIN. Try again.</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {NUMPAD.flat().map((d, i) => (
            <button key={i} onClick={() => d === '⌫' ? onDelete() : d !== '' ? onInput(d) : undefined}
              className="transition-enterprise"
              style={{ height: 64, borderRadius: 18, border: d === '' ? 'none' : '1px solid var(--border-color)', background: d === '' ? 'transparent' : 'var(--surface-color)', color: d === '⌫' ? 'var(--text-color)' : 'var(--text-color)', opacity: d === '⌫' ? 0.6 : 1, fontSize: d === '⌫' ? 22 : 24, fontWeight: 600, cursor: d === '' ? 'default' : 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dotted var(--border-color)', width: '100%' }}>
          <button onClick={() => signIn('google')} className="transition-enterprise" style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'var(--text-color)', color: 'var(--bg-color)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}>
             <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 18 }} />
             Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
