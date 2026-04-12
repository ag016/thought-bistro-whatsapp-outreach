'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateTag: (id: string, tag: string) => Promise<void>;
}

export default function KanbanBoard({ leads, onUpdateTag }: KanbanBoardProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const uniqueTags = Array.from(new Set(leads.map(l => l.internal_tag).filter(Boolean))).sort();
  const columns = ['No Tag', ...uniqueTags];

  const handleTagChange = async (leadId: string, newTag: string) => {
    setUpdatingId(leadId);
    try {
      await onUpdateTag(leadId, newTag === 'No Tag' ? '' : newTag);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: 20, 
      overflowX: 'auto', 
      paddingBottom: 20,
      alignItems: 'flex-start' 
    }}>
      {columns.map(colTag => {
        const colLeads = leads.filter(l => {
          if (colTag === 'No Tag') return !l.internal_tag;
          return l.internal_tag === colTag;
        });

        return (
          <div key={colTag} style={{ 
            minWidth: 300, 
            maxWidth: 300, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0 8px', 
              marginBottom: 4 
            }}>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 800, 
                color: 'var(--text-color)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {colTag} 
                <span style={{ 
                  fontSize: 10, 
                  background: 'var(--border-color)', 
                  color: 'var(--text-color)', 
                  opacity: 0.6, 
                  padding: '2px 6px', 
                  borderRadius: 10 
                }}>{colLeads.length}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colLeads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="transition-enterprise"
                  style={{ 
                    background: 'var(--surface-color)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 12, 
                    padding: '12px', 
                    cursor: 'pointer',
                    transition: 'transform 0.1s, border-color 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-color)', marginBottom: 4 }}>
                    {lead.full_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6, marginBottom: 8 }}>
                    {lead.company_name || '—'}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.4 }}>
                      Step {lead.current_step + 1}
                    </div>
                    
                    <select 
                      value={lead.internal_tag || 'No Tag'}
                      onChange={(e) => {
                        // Stop propagation to prevent navigation to detail page
                        e.stopPropagation();
                        handleTagChange(lead.id, e.target.value);
                      }}
                      disabled={updatingId === lead.id}
                      style={{ 
                        fontSize: 11, 
                        padding: '2px 4px', 
                        borderRadius: 6, 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-color)', 
                        color: 'var(--text-color)',
                        cursor: 'pointer'
                      }}
                    >
                      {columns.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {updatingId === lead.id && (
                    <div style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      background: 'rgba(0,0,0,0.1)', 
                      borderRadius: 12, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backdropFilter: 'blur(1px)'
                    }}>
                      <div style={{ width: 16, height: 16, border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
