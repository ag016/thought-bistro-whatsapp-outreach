'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { calculateIsDue, generateWhatsAppLink, NURTURE_SEQUENCE, personalizeMessage, autoSelectVariant, autoExtractNickname } from '@/lib/nurture';
import { useSession, signIn } from 'next-auth/react';
import ViewSwitcher from '@/components/Dashboard/ViewSwitcher';
import KanbanBoard from '@/components/Dashboard/KanbanBoard';
import LeadList from '@/components/Dashboard/LeadList';
import { Skeleton } from '@/components/UI/Skeleton';

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadStatus = 'active' | 'paused' | 'converted' | 'completed';
type MainFilter = 'all' | 'due' | 'active' | 'paused';

interface Lead {
  id: string;
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  current_step: number;
  status: LeadStatus;
  internal_tag?: string;
  nickname?: string;
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
  internal_tag?: string;
  metadata: Lead['metadata'];
}

interface NurtureEntry {
  current_step: number;
  status: LeadStatus;
  last_sent_at: string | null;
  nickname?: string;
}

type NurtureMap = Record<string, NurtureEntry>;

// ── Constants ─────────────────────────────────────────────────────────────────

const CORRECT_PIN = '132103';
const AUTH_KEY    = 'tb_auth_session';
const TAB_KEY     = 'tb_last_tab'; // persists which tab the user was on

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeLeads(sheetLeads: SheetLead[], nurtureMap: NurtureMap): Lead[] {
  return sheetLeads
    .filter(sl => sl.full_name || sl.phone_number)
    .map(sl => {
      const nurture = nurtureMap[sl.sheet_id];
      let currentStep = parseInt(String(nurture?.current_step ?? '0'));
      if (isNaN(currentStep)) currentStep = 0;
      
      // Auto-extract nickname if missing in nurture data
      const nickname = (nurture as any)?.nickname || autoExtractNickname(sl.full_name);

      return {
        id: sl.sheet_id,
        sheet_id: sl.sheet_id,
        full_name: sl.full_name,
        phone_number: sl.phone_number,
        company_name: sl.company_name,
        created_at: sl.created_at,
        internal_tag: sl.internal_tag || '',
        nickname: nickname,
        metadata: sl.metadata,
        current_step: currentStep,
        status: nurture?.status || 'active',
        last_sent_at: nurture?.last_sent_at || null,
      } as Lead;
    })
    .reverse(); // LIFO — newest leads appear first
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

// ── Add Lead Modal ─────────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lead: Lead) => void }) {
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    company_name: '',
    clinic_type: '',
    nickname: '',
    lead_quality_desc: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name && !form.phone_number) {
      setError('Full name or phone number is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');
      const newLead: Lead = {
        id: data.lead.sheet_id,
        sheet_id: data.lead.sheet_id,
        full_name: data.lead.full_name,
        phone_number: data.lead.phone_number,
        company_name: data.lead.company_name,
        created_at: data.lead.created_at,
        internal_tag: '',
        nickname: form.nickname,
        metadata: data.lead.metadata,
        current_step: 0,
        status: 'active',
        last_sent_at: null,
      };
      onAdd(newLead);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="pane-card"
        style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-color)' }}>Add Lead Manually</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: 22, cursor: 'pointer', opacity: 0.5 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>FULL NAME *</label>
            <input type="text" value={form.full_name} onChange={set('full_name')} className="input-field" style={{ width: '100%' }} placeholder="Dr. Rajesh Kumar" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>ADDRESSED NAME (NICKNAME)</label>
            <input type="text" value={form.nickname} onChange={set('nickname')} className="input-field" style={{ width: '100%' }} placeholder="e.g. Dr. Rajesh (used in all messages)" />
            <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.35, marginTop: 4 }}>Prevents "Dr. Dr." issue in outgoing messages</div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>PHONE NUMBER *</label>
            <input type="tel" value={form.phone_number} onChange={set('phone_number')} className="input-field" style={{ width: '100%' }} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>CLINIC / COMPANY NAME</label>
            <input type="text" value={form.company_name} onChange={set('company_name')} className="input-field" style={{ width: '100%' }} placeholder="Wellness Clinic Pvt Ltd" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>CLINIC TYPE</label>
            <input type="text" value={form.clinic_type} onChange={set('clinic_type')} className="input-field" style={{ width: '100%' }} placeholder="Dermatology, Obesity, Dental…" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-color)', opacity: 0.5, display: 'block', marginBottom: 6 }}>LEAD SITUATION / PROBLEM</label>
            <textarea value={form.lead_quality_desc} onChange={set('lead_quality_desc')} className="input-field" style={{ width: '100%', resize: 'vertical', minHeight: 60, fontSize: 13 }} placeholder="e.g. Leads don't have budget, don't show up…" />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger-color)', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary transition-enterprise"
            style={{ padding: '12px', fontWeight: 700, fontSize: 14 }}
          >
            {saving ? 'Adding Lead…' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Notification Bell ──────────────────────────────────────────────────────────

function NotificationBell({ dueLeads, leads, onMarkSent }: { dueLeads: Lead[], leads: Lead[], onMarkSent: (id: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acked, setAcked] = useState<{ steps: Record<string, number> }>({ steps: {} });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('acknowledged_notifications');
    if (saved) {
      try {
        setAcked(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse acknowledged_notifications');
      }
    }
  }, []);

  const acknowledge = useCallback((leadId: string, currentStep: number) => {
    setAcked(prev => {
      const next = { ...prev, steps: { ...prev.steps, [leadId]: currentStep } };
      localStorage.setItem('acknowledged_notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = () => {
    setAcked(prev => {
      const nextSteps = { ...prev.steps };
      dueLeads.forEach(l => {
        nextSteps[l.id] = l.current_step;
      });
      const next = { ...prev, steps: nextSteps };
      localStorage.setItem('acknowledged_notifications', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter out acknowledged follow-ups
  const unreadDue = dueLeads.filter(l => (acked.steps[l.id] ?? -1) < l.current_step);

  // PWA Registration and Smart Notifications
  useEffect(() => {
    async function handleNotifications() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Ensure subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'placeholder_public_key'
          });

          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
          });
        }

        // 1. Detect New Leads
        const knownLeadIds = JSON.parse(localStorage.getItem('notified_leads') || '[]');
        const newLeads = leads.filter(l => !knownLeadIds.includes(l.id));
        
        if (newLeads.length > 0) {
          const latestLead = newLeads[0];
          await triggerPush({
            title: '🎉 New Lead Arrived!',
            body: `${latestLead.full_name} just joined the machine.`,
            url: `/leads/${latestLead.id}?tab=all`,
            waLink: generateWhatsAppLink(latestLead.phone_number, `Hi ${latestLead.full_name}, welcome!`)
          }, subscription);
          
          localStorage.setItem('notified_leads', JSON.stringify([...knownLeadIds, ...newLeads.map(l => l.id)]));
        }

        // 2. Detect Newly Due Messages
        const notifiedSteps = JSON.parse(localStorage.getItem('notified_steps') || '{}');
        const newlyDue = dueLeads.filter(l => (notifiedSteps[l.id] || -1) < l.current_step);

        if (newlyDue.length > 0) {
          const dueLead = newlyDue[0];
          await triggerPush({
            title: '⏰ Follow-up Due',
            body: `${dueLead.full_name} is due for message ${dueLead.current_step + 1}`,
            url: `/leads/${dueLead.id}?tab=due`,
            waLink: generateWhatsAppLink(dueLead.phone_number, personalizeMessage(
              NURTURE_SEQUENCE[dueLead.current_step]?.message_text || '', 
              dueLead.full_name, 
              dueLead.metadata.clinic_type, 
              dueLead.nickname
            ))
          }, subscription);

          const updatedSteps = { ...notifiedSteps, [dueLead.id]: dueLead.current_step };
          localStorage.setItem('notified_steps', JSON.stringify(updatedSteps));
        }

      } catch (e) {
        console.error('Notification system error:', e);
      }
    }

    async function triggerPush(payload: any, subscription: PushSubscription | null) {
      if (!subscription) return;
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: [subscription],
          notifications: [payload]
        })
      });
    }

    handleNotifications();
  }, [leads, dueLeads]);

  const prevDueCount = useRef(dueLeads.length);
  useEffect(() => {
    if (
      dueLeads.length > prevDueCount.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const newest = dueLeads[0];
      const n = new Notification('Bistro CRM — Follow-up Due', {
        body: `${newest.full_name} is due for message ${newest.current_step + 1}`,
        icon: 'https://d1yei2z3i6k35z.cloudfront.net/10516146/675d2acfd4750_LogoOtoChatNBG.003.png',
      });
      n.onclick = () => {
        window.focus();
        router.push(`/leads/${newest.id}?tab=due`);
        acknowledge(newest.id, newest.current_step);
      };
    }
    prevDueCount.current = dueLeads.length;
  }, [dueLeads, router, acknowledge]);

  const getNextMsgLink = (lead: Lead) => {
    const stepIdx = lead.current_step;
    if (stepIdx >= NURTURE_SEQUENCE.length) return '';
    const step = NURTURE_SEQUENCE[stepIdx];
    const variant = autoSelectVariant(step.step_number, lead.metadata.lead_quality_desc, step.variants);
    const base = variant ? variant.text : step.message_text;
    const text = personalizeMessage(base, lead.full_name, lead.metadata.clinic_type, lead.nickname);
    return generateWhatsAppLink(lead.phone_number, text);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="transition-enterprise"
        style={{
          position: 'relative',
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        🔔
        {unreadDue.length > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            background: 'var(--accent-color)',
            color: 'var(--bg-color)',
            borderRadius: '50%',
            width: 18, height: 18,
            fontSize: 10,
            fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadDue.length > 9 ? '9+' : unreadDue.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          width: 320,
          maxHeight: 400,
          overflowY: 'auto',
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: 14,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-color)' }}>
              {unreadDue.length === 0 ? '🎉 All caught up!' : `${unreadDue.length} unread`}
            </span>
            {unreadDue.length > 0 && (
              <button
                onClick={clearAll}
                style={{ background: 'none', border: 'none', color: 'var(--text-color)', opacity: 0.4, fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                className="transition-enterprise"
              >
                Clear All
              </button>
            )}
          </div>
          {unreadDue.length === 0 ? (
            <div style={{ padding: '24px 16px', fontSize: 12, color: 'var(--text-color)', opacity: 0.5, textAlign: 'center' }}>
              No pending follow-ups right now.
            </div>
          ) : (
            unreadDue.slice(0, 8).map(lead => {
              const waLink = getNextMsgLink(lead);
              return (
                <div
                  key={lead.id}
                  style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-color)', cursor: 'pointer' }}
                        onClick={() => { 
                          setOpen(false); 
                          acknowledge(lead.id, lead.current_step);
                          router.push(`/leads/${lead.id}?tab=due`); 
                        }}
                      >
                        {lead.full_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.5 }}>
                        Msg {lead.current_step + 1} due · {lead.metadata.clinic_type || lead.company_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { 
                        setOpen(false); 
                        acknowledge(lead.id, lead.current_step);
                        router.push(`/leads/${lead.id}?tab=due`); 
                      }}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      View Lead
                    </button>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => acknowledge(lead.id, lead.current_step)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          borderRadius: 8,
                          background: 'var(--accent-color)',
                          color: 'var(--bg-color)',
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                          textAlign: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        Send Next ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * TabRestorer reads the ?tab= search param (requires Suspense boundary)
 * and initialises the mainFilter state on mount.
 */
function TabRestorer({ onRestore }: { onRestore: (tab: MainFilter) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab') as MainFilter | null;
    if (tabParam && ['all', 'due', 'active', 'paused'].includes(tabParam)) {
      onRestore(tabParam);
    } else {
      const saved = sessionStorage.getItem(TAB_KEY) as MainFilter | null;
      if (saved && ['all', 'due', 'active', 'paused'].includes(saved)) {
        onRestore(saved);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function AppInner() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [authed,       setAuthed]       = useState(false);
  const [pin,          setPin]          = useState('');
  const [pinShake,     setPinShake]     = useState(false);
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [mainFilter,   setMainFilter]   = useState<MainFilter>('all');
  const [activeFilters, setActiveFilters] = useState({ clinic: '', status: '', tag: '', problem: '' });
  const [view,         setView]         = useState<'list' | 'board'>('list');
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [showAddLead,  setShowAddLead]  = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === '1') setAuthed(true);
  }, []);

  // Tab restoration is handled by <TabRestorer> in JSX (needs Suspense boundary)

  const loadLeads = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      const [leadsRes, nurtureRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/nurture')
      ]);
      const data  = await leadsRes.json()  as { leads?: SheetLead[]; error?: string };
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

  useEffect(() => {
    if (isAccessGranted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputPin(e.key);
      else if (e.key === 'Backspace') deletePin();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [authed, inputPin]);

  // Persist active tab on change
  const setMainFilterAndSave = (f: MainFilter) => {
    setMainFilter(f);
    if (typeof window !== 'undefined') sessionStorage.setItem(TAB_KEY, f);
  };

  const handleMarkSent = async (id: string) => {
    const lead = leads.find(l => l.id === id); if (!lead) return;
    const nextStep = Math.min(lead.current_step + 1, NURTURE_SEQUENCE.length);
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, current_step: nextStep, last_sent_at: now } : l));
    await fetch('/api/nurture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id, currentStep: nextStep, lastSentAt: now, msgIndex: lead.current_step + 1, sentAt: now })
    });
  };

  const handlePause = async (id: string) => {
    const lead = leads.find(l => l.id === id); if (!lead) return;
    const newStatus = lead.status === 'paused' ? 'active' : 'paused';
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
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

  // Before navigating to a lead, persist the current tab
  const navigateToLead = (leadId: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(TAB_KEY, mainFilter);
    router.push(`/leads/${leadId}?tab=${mainFilter}`);
  };

  const dueLeads = leads.filter(l => calculateIsDue(l));

  const displayLeads = leads.filter(l => {
    if (mainFilter === 'due'    && !calculateIsDue(l)) return false;
    if (mainFilter === 'active' && l.status !== 'active') return false;
    if (mainFilter === 'paused' && l.status !== 'paused') return false;
    if (activeFilters.clinic  && l.metadata.clinic_type  !== activeFilters.clinic)  return false;
    if (activeFilters.status  && l.metadata.lead_status  !== activeFilters.status)  return false;
    if (activeFilters.tag     && l.internal_tag          !== activeFilters.tag)     return false;
    if (activeFilters.problem && l.metadata.lead_quality_desc !== activeFilters.problem) return false;
    return true;
  });

  const filterOptions = {
    clinics:   Array.from(new Set(leads.map(l => l.metadata.clinic_type))).filter(Boolean) as string[],
    statuses:  Array.from(new Set(leads.map(l => l.metadata.lead_status))).filter(Boolean) as string[],
    tags:      Array.from(new Set(leads.map(l => l.internal_tag))).filter(Boolean) as string[],
    problems:  Array.from(new Set(leads.map(l => l.metadata.lead_quality_desc))).filter(Boolean) as string[],
  };

  const clearAllFilters = () => {
    setMainFilterAndSave('all');
    setActiveFilters({ clinic: '', status: '', tag: '', problem: '' });
  };

  if (status === 'loading') return null;
  if (!isAccessGranted) return <PinScreen pin={pin} shake={pinShake} onInput={inputPin} onDelete={deletePin} />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: 80 }}>
      {/* Tab restorer — must be in Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <TabRestorer onRestore={setMainFilterAndSave} />
      </Suspense>
      <style>{`
        .stats-grid   { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(min-width:768px)  { 
          .stats-grid { grid-template-columns:repeat(4,1fr); } 
        }
      `}</style>

      {/* ── Sticky Header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'color-mix(in srgb, var(--surface-color), transparent 10%)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', padding: '14px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="https://d1yei2z3i6k35z.cloudfront.net/10516146/67e5ae77eae02_LogoBanner.001.png"
              alt="Bistro CRM Logo"
              style={{ height: 28, width: 'auto', objectFit: 'contain' }}
            />
            <span style={{ fontSize: 12, color: 'var(--accent-color)', opacity: 0.8, fontWeight: 600, borderLeft: '1px solid var(--border-color)', paddingLeft: 12 }}>
              Lead Machine · {leads.length} leads
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Add Lead Button */}
            <button
              onClick={() => setShowAddLead(true)}
              className="transition-enterprise"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'var(--accent-color)', border: 'none', color: 'var(--bg-color)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              + Add Lead
            </button>
            {/* Notification Bell */}
            <NotificationBell 
              dueLeads={dueLeads} 
              leads={leads} 
              onMarkSent={handleMarkSent} 
            />
            {/* Sync Button */}
            <button onClick={handleSync} disabled={syncing || loading} className="transition-enterprise" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', fontSize: 13, fontWeight: 600, cursor: syncing || loading ? 'not-allowed' : 'pointer', opacity: syncing || loading ? 0.5 : 1 }}>
              <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>⟳</span>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 32px 0', width: '100%' }}>

        {/* ── Stats Bar ── */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <StatCard label="Total Leads"  value={leads.length}                              active={mainFilter === 'all'}    onClick={() => setMainFilterAndSave('all')} />
          <StatCard label="Due Today"    value={dueLeads.length}   accent                  active={mainFilter === 'due'}    onClick={() => setMainFilterAndSave('due')} />
          <StatCard label="Active"       value={leads.filter(l => l.status === 'active').length}  active={mainFilter === 'active'} onClick={() => setMainFilterAndSave('active')} />
          <StatCard label="Paused"       value={leads.filter(l => l.status === 'paused').length}  active={mainFilter === 'paused'} onClick={() => setMainFilterAndSave('paused')} />
        </div>

        {/* ── API Error ── */}
        {apiError && (
          <div style={{ background: 'color-mix(in srgb, var(--surface-color), var(--danger-color) 15%)', border: '1px solid var(--danger-color)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--danger-color)' }}>
            <strong>⚠️ Error:</strong> {apiError}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterDropdown label="Clinic Type"  value={activeFilters.clinic}  options={filterOptions.clinics}  onChange={v => setActiveFilters(f => ({ ...f, clinic: v }))} />
              <FilterDropdown label="Problem"      value={activeFilters.problem} options={filterOptions.problems} onChange={v => setActiveFilters(f => ({ ...f, problem: v }))} shorten />
              <FilterDropdown label="Meta Status"  value={activeFilters.status}  options={filterOptions.statuses} onChange={v => setActiveFilters(f => ({ ...f, status: v }))} />
              <FilterDropdown label="Internal Tag" value={activeFilters.tag}     options={filterOptions.tags}     onChange={v => setActiveFilters(f => ({ ...f, tag: v }))} />
              {(activeFilters.clinic || activeFilters.status || activeFilters.tag || activeFilters.problem || mainFilter !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="transition-enterprise"
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '8px 12px', opacity: 0.8 }}
                >
                  ✕ Clear All
                </button>
              )}
            </div>
            <ViewSwitcher view={view} onViewChange={setView} />
          </div>
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
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rect" height={80} />)}
            </div>
          </div>
        ) : displayLeads.length === 0 ? (
          <EmptyState tab={mainFilter} />
        ) : (
          <div style={{ paddingBottom: 24 }}>
            {view === 'list' ? (
              <LeadList leads={displayLeads} onPause={handlePause} onUpdateTag={handleUpdateTag} onNavigate={navigateToLead} />
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

      {/* ── Add Lead Modal ── */}
      {showAddLead && (
        <AddLeadModal
          onClose={() => setShowAddLead(false)}
          onAdd={newLead => setLeads(prev => [newLead, ...prev])}
        />
      )}
    </div>
  );
}

// ── Default export wraps AppInner in Suspense (needed for useSearchParams) ───

export default function App() {
  return (
    <Suspense fallback={null}>
      <AppInner />
    </Suspense>
  );
}

// ── Small components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent = false, active = false, onClick }: { label: string; value: number; accent?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`transition-enterprise ${accent ? '' : 'deep-shadow'}`}
      style={{
        padding: '14px 16px',
        borderRadius: 16,
        background: active ? (accent ? 'var(--bg-color)' : 'var(--accent-color)') : (accent ? 'var(--accent-color)' : 'var(--surface-color)'),
        border: `1px solid ${active ? 'var(--accent-color)' : 'var(--border-color)'}`,
        boxShadow: accent ? `0 0 25px color-mix(in srgb, var(--accent-color), transparent 60%)` : '0 4px 12px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        transform: active ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: active ? (accent ? 'var(--accent-color)' : 'var(--bg-color)') : (accent ? 'var(--bg-color)' : 'var(--text-color)'), opacity: accent ? 0.9 : 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: active ? (accent ? 'var(--accent-color)' : 'var(--bg-color)') : (accent ? 'var(--bg-color)' : 'var(--text-color)') }}>{value}</div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange, shorten = false }: { label: string; value: string; options: string[]; onChange: (v: string) => void; shorten?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="transition-enterprise"
        style={{
          appearance: 'none',
          background: value ? 'color-mix(in srgb, var(--accent-color), transparent 90%)' : 'var(--surface-color)',
          border: `1px solid ${value ? 'var(--accent-color)' : 'var(--border-color)'}`,
          borderRadius: 12,
          padding: '8px 32px 8px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: value ? 'var(--accent-color)' : 'var(--text-color)',
          cursor: 'pointer',
          outline: 'none',
          maxWidth: shorten ? 140 : 180,
          textOverflow: 'ellipsis'
        }}
      >
        <option value="">{label}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{shorten && opt.length > 25 ? opt.slice(0, 25) + '...' : opt}</option>
        ))}
      </select>
      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, opacity: 0.5 }}>▼</div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--accent-color)' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{tab === 'due' ? '🎉' : '📭'}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-color)', marginBottom: 6 }}>{tab === 'due' ? 'All caught up!' : 'No results found'}</div>
      <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.6 }}>Try clearing filters to see more leads.</div>
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
          <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <img src="https://d1yei2z3i6k35z.cloudfront.net/10516146/675d2acfd4750_LogoOtoChatNBG.003.png" alt="Bistro CRM" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, color: 'var(--text-color)', letterSpacing: '-0.3px' }}>Bistro CRM</div>
          <div style={{ fontSize: 13, color: 'var(--accent-color)', fontWeight: 600, marginTop: 4 }}>Enterprise Lead Management</div>
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
              style={{ height: 64, borderRadius: 18, border: d === '' ? 'none' : '1px solid var(--border-color)', background: d === '' ? 'transparent' : 'var(--surface-color)', color: 'var(--text-color)', opacity: d === '⌫' ? 0.6 : 1, fontSize: d === '⌫' ? 22 : 24, fontWeight: 600, cursor: d === '' ? 'default' : 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dotted var(--border-color)', width: '100%' }}>
          <button onClick={() => signIn('google')} className="transition-enterprise" style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'var(--text-color)', color: 'var(--bg-color)', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 18 }} />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
