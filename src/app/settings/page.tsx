'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === 'loading') return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: '#060d06', color: '#ecfdf5', padding: '24px' }}>
      <style>{`
        .settings-section { background: #0d1a0d; border: 1px solid #1a2e1a; border-radius: 18px; padding: 20px; margin-bottom: 20px; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: '12px 0'; border-bottom: 1px solid #1a2e1a; }
        .settings-row:last-child { border-bottom: none; }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.push('/')} style={{ background: '#0d1a0d', border: '1px solid #1a2e1a', borderRadius: 10, color: '#25D366', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Settings</h1>
        </div>

        {/* Account Section */}
        <div className="settings-section">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 16 }}>ACCOUNT</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: '#0a150a', borderRadius: 12, border: '1px solid #1a2e1a' }}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" style={{ width: 24 }} alt="Google" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{session?.user?.name || 'Not Signed In'}</div>
                <div style={{ fontSize: 12, color: '#5a8a5a' }}>{session?.user?.email || 'No Google account linked'}</div>
              </div>
              {session && (
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* General Settings Section */}
        <div className="settings-section">
          <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', letterSpacing: '0.08em', marginBottom: 16 }}>GENERAL</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SettingsRow label="CRM Name" value="Thought Bistro Lead Machine" />
            <SettingsRow label="Currency" value="INR (₹)" />
            <SettingsRow label="Timezone" value="Asia/Kolkata (IST)" />
            <SettingsRow label="Notifications" value="Enabled" isToggle />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>
          <div style={{ fontSize: 11, color: '#3a5a3a' }}>v1.2.0 Stable Build</div>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ label, value, isToggle = false }: { label: string; value: string; isToggle?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a2e1a' }}>
      <span style={{ fontSize: 13, color: '#8ab48a' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#ecfdf5' }}>{value}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#060d06', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a8a5a' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #25D366', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
