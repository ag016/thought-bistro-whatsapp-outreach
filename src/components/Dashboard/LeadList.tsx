'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';

interface LeadListProps {
  leads: Lead[];
  onPause: (id: string) => void;
  onSend: (id: string) => void;
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

export default function LeadList({ leads, onPause, onSend }: LeadListProps) {
  const router = useRouter();
  const [tagFilter, setTagFilter] = useState('');
  
  const uniqueTags = Array.from(new Set(leads.map(l => l.internal_tag).filter(Boolean))).sort();
  
  const filteredLeads = leads.filter(l => {
    if (!tagFilter) return true;
    return l.internal_tag === tagFilter;
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Global Tag Filter */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 16, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        padding: '8px 0'
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-color)', opacity: 0.6 }}>Filter by Tag:</span>
        <button 
          onClick={() => setTagFilter('')} 
          className="transition-enterprise"
          style={{ 
            padding: '4px 12px', 
            borderRadius: 20, 
            fontSize: 12, 
            fontWeight: 600, 
            border: '1px solid var(--border-color)', 
            background: tagFilter === '' ? 'var(--accent-color)' : 'var(--surface-color)', 
            color: tagFilter === '' ? 'var(--bg-color)' : 'var(--text-color)',
            cursor: 'pointer',
            transition: 'all 0.2s'
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
              padding: '4px 12px', 
              borderRadius: 20, 
              fontSize: 12, 
              fontWeight: 600, 
              border: '1px solid var(--border-color)', 
              background: tagFilter === tag ? 'var(--accent-color)' : 'var(--surface-color)', 
              color: tagFilter === tag ? 'var(--bg-color)' : 'var(--text-color)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      <table className="data-grid">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Phone</th>
            <th>Tag</th>
            <th>Progress</th>
            <th>Last Contact</th>
            <th>Qualification</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredLeads.map(lead => (
            <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} style={{ cursor: 'pointer' }}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    background: lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)',
                    boxShadow: `0 0 8px ${lead.status === 'paused' ? 'var(--warning-color)' : 'var(--accent-color)'}`
                  }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{lead.full_name || 'Unknown'}</span>
                </div>
              </td>
              <td style={{ opacity: 0.7 }}>{lead.phone_number}</td>
              <td>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: 10, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  background: lead.internal_tag ? 'rgba(255,255,255,0.1)' : 'transparent', 
                  color: lead.internal_tag ? 'var(--text-color)' : 'var(--text-color)', 
                  opacity: lead.internal_tag ? 0.8 : 0.4,
                  border: lead.internal_tag ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
                }}>
                  {lead.internal_tag || 'No Tag'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>Step {lead.current_step + 1}/10</span>
                  <div style={{ width: 60, height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${((lead.current_step + 1) / 10) * 100}%`, 
                      height: '100%', 
                      background: 'var(--accent-color)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </td>
              <td style={{ opacity: 0.7 }}>{formatDate(lead.last_sent_at)}</td>
              <td>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{lead.metadata?.lead_status || 'Unknown'}</span>
              </td>
              <td>
                <button 
                  onClick={(e) => { e.stopPropagation(); onSend(lead.id); }}
                  className="transition-enterprise"
                  style={{ 
                    padding: '6px 12px', 
                    borderRadius: 8, 
                    background: 'var(--accent-color)', 
                    color: 'var(--bg-color)', 
                    fontSize: 11, 
                    fontWeight: 700, 
                    border: 'none', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Quick Send
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
