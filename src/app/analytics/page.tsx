'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Lead {
  id: string;
  created_at: string;
  metadata: {
    lead_status: string;
    [key: string]: any;
  };
}

interface NurtureData {
  [leadId: string]: Record<string, string>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    day: 0,
    week: 0,
    month: 0,
    qualified: 0,
    messagesSent: 0,
  });

  const calculateStats = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, nurtureRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/nurture'),
      ]);
      const leadsData = await leadsRes.json() as { leads?: Lead[] };
      const nurtureData = await nurtureRes.json() as { nurture?: NurtureData };
      
      const leads = leadsData.leads ?? [];
      const nurture = nurtureData.nurture ?? {};
      
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      const oneWeek = 7 * oneDay;
      const oneMonth = 30 * oneDay;

      let dayCount = 0;
      let weekCount = 0;
      let monthCount = 0;
      let qualifiedCount = 0;
      let totalMsgs = 0;

      leads.forEach(l => {
        const createdDate = parseSheetDate(l.created_at);
        const diff = now.getTime() - createdDate.getTime();

        if (diff <= oneDay) dayCount++;
        if (diff <= oneWeek) weekCount++;
        if (diff <= oneMonth) monthCount++;

        if (l.metadata?.lead_status === 'Qualified') qualifiedCount++;

        // Count messages sent for this lead
        const nEntry = nurture[l.id] || {};
        Object.keys(nEntry).forEach(key => {
          if (key.startsWith('msg') && key.endsWith('_sent')) {
            totalMsgs++;
          }
        });
      });

      setStats({
        total: leads.length,
        day: dayCount,
        week: weekCount,
        month: monthCount,
        qualified: qualifiedCount,
        messagesSent: totalMsgs,
      });
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  if (status === 'loading' || loading) return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: '#ecfdf5', padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.push('/')} style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 10, color: '#25D366', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Analytics</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Leads" value={stats.total} />
          <StatCard label="Qualified" value={stats.qualified} accent="#eab308" />
          <StatCard label="Msgs Sent" value={stats.messagesSent} accent="#25D366" />
          <StatCard label="Conv. Rate" value={stats.total ? Math.round((stats.qualified / stats.total) * 100) + '%' : '0%'} />
        </div>

        <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 24, padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 20 }}>ACQUISITION TIMELINE</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TimelineRow label="Last 24 Hours" value={stats.day} color="#25D366" />
            <TimelineRow label="Last 7 Days" value={stats.week} color="#3b82f6" />
            <TimelineRow label="Last 30 Days" value={stats.month} color="#a855f7" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = '#ecfdf5' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 20, padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5a8a5a', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function TimelineRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}60` }} />
      <div style={{ flex: 1, fontSize: 14, color: '#8ab48a' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#ecfdf5' }}>{value}</div>
    </div>
  );
}

function parseSheetDate(str: string) {
  if (!str) return new Date();
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (parts) {
    const [, d, m, y, h, min, s] = parts;
    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
  }
  return new Date(str);
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a8a5a' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
