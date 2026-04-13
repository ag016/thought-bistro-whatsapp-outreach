'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';

interface LeadListProps {
  leads: Lead[];
  onPause: (id: string) => void;
  onUpdateTag: (id: string, tag: string) => Promise<void>;
  onNavigate?: (id: string) => void;
}

function formatDate(str: string | null) {
  if (!str) return '—';
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return str;
  }
}

export default function LeadList({ leads, onPause, onUpdateTag, onNavigate }: LeadListProps) {
  const router = useRouter();
  const [tagFilter, setTagFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const handleRowClick = (id: string) => {
    if (onNavigate) onNavigate(id);
    else router.push(`/leads/${id}`);
  };

  const uniqueTags = Array.from(new Set(leads.map(l => l.internal_tag).filter(Boolean))).sort();
  const tagOptions = ['NEW', 'HOT', 'WARM', 'COLD', 'FOLLOW_UP', 'CONVERTED'];
  
  const filteredLeads = leads.filter(l => {
    if (!tagFilter) return true;
    return l.internal_tag === tagFilter;
  });

  const handleTagChange = async (leadId: string, newTag: string) => {
    setUpdatingId(leadId);
    try {
      await onUpdateTag(leadId, newTag === 'No Tag' ? '' : newTag);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .lead-list-table { width: 100%; border-collapse: collapse; display: table; }
        .lead-mobile-cards { display: none; }
        
        @media (max-width: 768px) {
          .lead-list-table { display: none; }
          .lead-mobile-cards { display: flex; flex-direction: column; gap: 12px; }
        }
      `}</style>

      {/* Global Tag Filter */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 20, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        padding: '8px 0'
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter:</span>
        <button 
          onClick={() => setTagFilter('')} 
          className="transition-enterprise"
          style={{ 
            padding: '6px 14px', 
            borderRadius: 20, 
            fontSize: 12, 
            fontWeight: 600, 
            border: '1px solid var(--border-color)', 
            background: tagFilter === '' ? 'var(--accent-color)' : 'var(--surface-color)', 
            color: tagFilter === '' ? 'var(--bg-color)' : 'var(--text-color)',
            cursor: 'pointer'
          }}
        >
          All
        </button>
        {uniqueTags.map(tag => (
          <button 
            key={tag} 
            onClick={() => setTagFilter(tag || '')} 
            className="transition-enterprise"
            style={{ 
              padding: '6px 14px', 
              borderRadius: 20, 
              fontSize: 12, 
              fontWeight: 600, 
              border: '1px solid var(--border-color)', 
              background: tagFilter === tag ? 'var(--accent-color)' : 'var(--surface-color)', 
              color: tagFilter === tag ? 'var(--bg-color)' : 'var(--text-color)',
              cursor: 'pointer'
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="pane-card lead-list-table" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, textTransform: 'uppercase' }}>Lead Name</th>
              <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, textTransform: 'uppercase' }}>Clinic / Phone</th>
              <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, textTransform: 'uppercase' }}>Internal Tag</th>
              <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, textTransform: 'uppercase' }}>Progress</th>
              <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-color)', opacity: 0.5, textTransform: 'uppercase' }}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr 
                key={lead.id} 
                className="transition-enterprise"
                onClick={() => handleRowClick(lead.id)} 
                style={{ 
                  cursor: 'pointer', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'transparent'
                }}
              >
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      background: lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)',
                      boxShadow: `0 0 10px ${lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)40'}`
                    }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-color)' }}>{lead.full_name || 'Unknown'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', opacity: 0.9 }}>{lead.company_name || '—'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.5 }}>{lead.phone_number}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ position: 'relative', width: 'fit-content' }}>
                    <select 
                      value={lead.internal_tag || 'No Tag'}
                      onChange={(e) => handleTagChange(lead.id, e.target.value)}
                      disabled={updatingId === lead.id}
                      className="transition-enterprise"
                      style={{ 
                        fontSize: 11, 
                        fontWeight: 700,
                        padding: '6px 24px 6px 12px', 
                        borderRadius: 100, 
                        border: '1px solid var(--border-color)', 
                        background: lead.internal_tag ? 'color-mix(in srgb, var(--accent-color), transparent 90%)' : 'var(--surface-color)', 
                        color: lead.internal_tag ? 'var(--accent-color)' : 'var(--text-color)',
                        cursor: 'pointer',
                        appearance: 'none',
                        outline: 'none',
                        width: 120
                      }}
                    >
                      <option value="No Tag">No Tag</option>
                      {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 9, opacity: 0.5 }}>▼</div>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 80, height: 6, background: 'var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${((lead.current_step + 1) / 10) * 100}%`, 
                        height: '100%', 
                        background: 'var(--accent-color)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{lead.current_step + 1}/10</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6 }}>{formatDate(lead.last_sent_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lead-mobile-cards">
        {filteredLeads.map(lead => (
          <div 
            key={lead.id}
            onClick={() => handleRowClick(lead.id)}
            className="pane-card transition-enterprise"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 8, height: 8, borderRadius: '50%', 
                  background: lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)',
                  boxShadow: `0 0 10px ${lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)40'}`
                }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-color)' }}>{lead.full_name || 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-color)', opacity: 0.5 }}>{lead.company_name} · {lead.phone_number}</div>
                </div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <select 
                  value={lead.internal_tag || 'No Tag'}
                  onChange={(e) => handleTagChange(lead.id, e.target.value)}
                  style={{ 
                    fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 100, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--accent-color)', outline: 'none'
                  }}
                >
                  <option value="No Tag">No Tag</option>
                  {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${((lead.current_step + 1) / 10) * 100}%`, height: '100%', background: 'var(--accent-color)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5 }}>Step {lead.current_step + 1}</span>
            </div>
            
            <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.4, textAlign: 'right' }}>
              Last Active: {formatDate(lead.last_sent_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

