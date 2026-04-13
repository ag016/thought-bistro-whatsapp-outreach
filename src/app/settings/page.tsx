'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('midnight');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'midnight';
    setCurrentTheme(savedTheme);
  }, []);

  const setTheme = (theme: string) => {
    localStorage.setItem('theme', theme);
    setCurrentTheme(theme);
    
    // Update root class immediately
    const root = document.documentElement;
    root.classList.remove('theme-midnight', 'theme-forest', 'theme-slate');
    root.classList.add('theme-' + theme);
  };

  if (status === 'loading') return <LoadingScreen />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', padding: '24px' }}>
      <style>{`
        .settings-section { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 18px; padding: 20px; margin-bottom: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .settings-row { display: flex; justify-content: space-between; align-items: center; padding: '12px 0'; border-bottom: 1px solid var(--border-color); }
        .settings-row:last-child { border-bottom: none; }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button onClick={() => router.push('/')} className="transition-enterprise" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--accent-color)', padding: '8px 14px', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>←</button>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Settings</h1>
        </div>

        {/* Account Section */}
        <div className="settings-section">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 16 }}>ACCOUNT</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="transition-enterprise" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--surface-color)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" style={{ width: 24 }} alt="Google" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{session?.user?.name || 'Not Signed In'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6 }}>{session?.user?.email || 'No Google account linked'}</div>
              </div>
              {session ? (
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  className="transition-enterprise"
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={() => signIn('google', { callbackUrl: '/' })} 
                  className="transition-enterprise"
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent-color)', border: 'none', color: 'var(--bg-color)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>

        {/* General Settings Section */}
        <div className="settings-section">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 16 }}>GENERAL</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SettingsRow label="CRM Name" value="Bistro CRM Lead Machine" />
            <SettingsRow label="Currency" value="INR (₹)" />
            <SettingsRow label="Timezone" value="Asia/Kolkata (IST)" />
            <SettingsRow label="Notifications" value="Enabled" isToggle />
            
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.7, marginBottom: 12 }}>Appearance Theme</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <ThemeOption label="Midnight" color="#0B0F1A" value="midnight" currentTheme={currentTheme} onClick={setTheme} />
                <ThemeOption label="Forest" color="#060D06" value="forest" currentTheme={currentTheme} onClick={setTheme} />
                <ThemeOption label="Slate" color="#0F172A" value="slate" currentTheme={currentTheme} onClick={setTheme} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>
          <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.4 }}>v1.2.0 Stable Build</div>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ label, value, isToggle = false }: { label: string; value: string; isToggle?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)' }}>{value}</span>
    </div>
  );
}

function ThemeOption({ label, color, value, currentTheme, onClick }: { label: string; color: string; value: string; currentTheme: string; onClick: (v: string) => void }) {
  const isActive = currentTheme === value;
  return (
    <div 
      onClick={() => onClick(value)}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 8, 
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: '50%', 
        background: color, 
        border: isActive ? '3px solid var(--accent-color)' : '2px solid var(--border-color)',
        boxShadow: isActive ? `0 0 10px var(--accent-color)60` : 'none',
        position: 'relative'
      }}>
        {isActive && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 6, height: 6, background: 'white', borderRadius: '50%' }} />
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: isActive ? 1 : 0.6, fontWeight: isActive ? 700 : 400 }}>{label}</div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
