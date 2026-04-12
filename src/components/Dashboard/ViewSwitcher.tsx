'use client';

import React from 'react';

interface ViewSwitcherProps {
  view: 'list' | 'board';
  setView: (view: 'list' | 'board') => void;
}

export default function ViewSwitcher({ view, setView }: ViewSwitcherProps) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      background: 'color-mix(in srgb, var(--border-color), transparent 50%)',
      borderRadius: 100, // full pill
      padding: 4,
      width: 160,
      gap: 4
    }}>
      {/* Sliding background element */}
      <div style={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        width: 'calc(50% - 6px)',
        background: 'var(--surface-color)',
        borderRadius: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.05)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: view === 'board' ? 'translateX(calc(100% + 4px))' : 'translateX(0)',
        zIndex: 0
      }} />

      {(['list', 'board'] as const).map(v => (
        <button 
          key={v} 
          onClick={() => setView(v)} 
          className="transition-enterprise"
          style={{ 
            flex: 1, 
            padding: '8px 0', 
            borderRadius: 100, 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: 13, 
            fontWeight: 600, 
            transition: 'color 0.3s', 
            background: 'transparent', 
            color: view === v ? 'var(--text-color)' : 'color-mix(in srgb, var(--text-color), transparent 40%)', 
            position: 'relative',
            zIndex: 1,
            textTransform: 'capitalize'
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
