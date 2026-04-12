'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateTag: (id: string, tag: string) => Promise<void>;
}

function formatDateMinimal(str: string) {
  if (!str) return '—';
  const parts = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (parts) {
    const [, d, m, y, h, min] = parts;
    const isPM = parseInt(h) >= 12;
    const hour12 = parseInt(h) % 12 || 12;
    return `${parseInt(d)}/${parseInt(m)} ${hour12}:${min} ${isPM ? 'PM' : 'AM'}`;
  }
  try { return new Date(str).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return str.split(' ')[0] || str; }
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
      gap: 24, 
      overflowX: 'auto', 
      paddingBottom: 40,
      alignItems: 'flex-start',
      minHeight: '70vh'
    }}>
      {columns.map(colTag => {
        const colLeads = leads.filter(l => {
          if (colTag === 'No Tag') return !l.internal_tag;
          return l.internal_tag === colTag;
        });

        return (
          <div key={colTag} style={{ 
            minWidth: 340,
            flex: 1,
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16 
          }}>
            {/* Column Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0 4px', 
              marginBottom: 4,
              borderBottom: '2px solid color-mix(in srgb, var(--text-color), transparent 90%)',
              paddingBottom: 12
            }}>
              <div style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                color: 'var(--text-color)', 
                letterSpacing: '0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {colTag} 
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 600,
                  background: 'color-mix(in srgb, var(--accent-color), transparent 90%)', 
                  color: 'var(--accent-color)', 
                  padding: '2px 8px', 
                  borderRadius: 100 
                }}>{colLeads.length}</span>
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {colLeads.map(lead => {
                const m = lead.metadata;
                return (
                  <div 
                    key={lead.id} 
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="transition-enterprise"
                    style={{ 
                      background: 'var(--surface-color)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 16, 
                      padding: '16px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                       e.currentTarget.style.borderColor = 'var(--accent-color)';
                       e.currentTarget.style.transform = 'translateY(-2px)';
                       e.currentTarget.style.boxShadow = '0 8px 24px color-mix(in srgb, var(--accent-color), transparent 90%), 0 2px 4px rgba(0,0,0,0.04)';
                    }}
                    onMouseLeave={(e) => {
                       e.currentTarget.style.borderColor = 'var(--border-color)';
                       e.currentTarget.style.transform = 'translateY(0)';
                       e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)';
                    }}
                  >
                    {/* Top Row: Date & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.5, fontWeight: 600 }}>
                        {formatDateMinimal(m.india_time || lead.created_at)}
                      </span>
                      {m.lead_status && (
                        <span style={{ 
                          fontSize: 10, 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          color: m.lead_status.toLowerCase() === 'qualified' ? '#10b981' : m.lead_status.toLowerCase() === 'not qualified' ? '#ef4444' : 'var(--text-color)',
                          background: m.lead_status.toLowerCase() === 'qualified' ? 'rgba(16, 185, 129, 0.1)' : m.lead_status.toLowerCase() === 'not qualified' ? 'rgba(239, 68, 68, 0.1)' : 'var(--border-color)',
                          padding: '2px 8px', borderRadius: 100 
                        }}>
                          {m.lead_status}
                        </span>
                      )}
                    </div>

                    {/* Identity */}
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-color)', marginBottom: 4, letterSpacing: '-0.01em' }}>
                      {lead.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.7, marginBottom: 16 }}>
                      {lead.phone_number} {lead.company_name ? `• ${lead.company_name}` : ''}
                    </div>
                    
                    {/* Detailed Metadata Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, background: 'color-mix(in srgb, var(--border-color), transparent 70%)', padding: 12, borderRadius: 10 }}>
                       <div>
                         <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5, fontWeight: 600, marginBottom: 2 }}>CAMPAIGN</div>
                         <div style={{ fontSize: 12, color: 'var(--text-color)', fontWeight: 500 }} className="truncate" title={m.campaign_name || '—'}>{m.campaign_name || '—'}</div>
                       </div>
                       <div>
                         <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5, fontWeight: 600, marginBottom: 2 }}>CLINIC TYPE</div>
                         <div style={{ fontSize: 12, color: 'var(--text-color)', fontWeight: 500 }} className="truncate" title={m.clinic_type || '—'}>{m.clinic_type || '—'}</div>
                       </div>
                       <div style={{ gridColumn: 'span 2' }}>
                         <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5, fontWeight: 600, marginBottom: 2 }}>PLATFORM / AD</div>
                         <div style={{ fontSize: 12, color: 'var(--text-color)', fontWeight: 500 }} className="truncate" title={`${m.platform || ''} ${m.ad_name ? `• ${m.ad_name}` : ''}`.trim() || '—'}>
                           {m.platform || ''} {m.ad_name ? `• ${m.ad_name}` : ''}
                         </div>
                       </div>
                    </div>

                    {/* Footer: Step & Tag Switch */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-color)', opacity: 0.6 }}>
                        Step {lead.current_step + 1}
                      </div>
                      
                      <div onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                        <select 
                          value={lead.internal_tag || 'No Tag'}
                          onChange={(e) => handleTagChange(lead.id, e.target.value)}
                          disabled={updatingId === lead.id}
                          className="transition-enterprise"
                          style={{ 
                            fontSize: 12, 
                            fontWeight: 600,
                            padding: '6px 28px 6px 12px', 
                            borderRadius: 100, 
                            border: '1px solid var(--border-color)', 
                            background: 'color-mix(in srgb, var(--surface-color), var(--text-color) 3%)', 
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            appearance: 'none',
                            outline: 'none'
                          }}
                        >
                          {columns.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, opacity: 0.5 }}>▼</div>
                      </div>
                    </div>

                    {updatingId === lead.id && (
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'color-mix(in srgb, var(--surface-color), transparent 30%)', 
                        borderRadius: 16, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)',
                        zIndex: 10
                      }}>
                        <div style={{ width: 24, height: 24, border: '3px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
