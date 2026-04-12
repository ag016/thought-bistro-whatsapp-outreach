'use client';

import React from 'react';

interface ViewSwitcherProps {
  view: 'list' | 'board';
  setView: (view: 'list' | 'board') => void;
}

export default function ViewSwitcher({ view, setView }: ViewSwitcherProps) {
  return (
    <div style={{ 
      display: 'flex', 
      background: 'var(--surface-color)', 
      border: '1px solid var(--border-color)', 
      borderRadius: 14, 
      padding: 4, 
      maxWidth: 200,
      marginBottom: 20,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {(['list', 'board'] as const).map(v => (
        <button 
          key={v} 
          onClick={() => setView(v)} 
          className="transition-enterprise"
          style={{ 
            flex: 1, 
            padding: '8px 0', 
            borderRadius: 10, 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: 13, 
            fontWeight: 700, 
            transition: 'all 0.2s', 
            background: view === v ? 'var(--accent-color)' : 'transparent', 
            color: view === v ? 'var(--bg-color)' : 'var(--text-color)', 
            opacity: view === v ? 1 : 0.5,
            textTransform: 'capitalize'
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
