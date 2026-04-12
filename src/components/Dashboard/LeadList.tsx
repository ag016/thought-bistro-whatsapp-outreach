'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';

interface LeadListProps {
  leads: Lead[];
  onPause: (id: string) => void;
}

export default function LeadList({ leads, onPause }: LeadListProps) {
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

      {/* Table Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', 
        gap: 16, 
        padding: '12px 16px', 
        borderBottom: '2px solid var(--border-color)',
        fontSize: 12, 
        fontWeight: 800, 
        color: 'var(--text-color)', 
        opacity: 0.5,
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
      }}>
        <div>Name</div>
        <div>Phone</div>
        <div>Tag</div>
        <div>Next Step</div>
        <div>Status</div>
      </div>

      {/* Table Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filteredLeads.map(lead => (
          <div 
            key={lead.id} 
            onClick={() => router.push(`/leads/${lead.id}`)}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', 
              gap: 16, 
              padding: '12px 16px', 
              background: 'var(--surface-color)', 
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'background 0.2s',
              alignItems: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'color-mix(in srgb, var(--surface-color), var(--accent-color) 5%)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-color)'}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.full_name || 'Unknown'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.7 }}>
              {lead.phone_number}
            </div>
            <div>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: 10, 
                fontSize: 11, 
                fontWeight: 600, 
                background: lead.internal_tag ? 'var(--border-color)' : 'transparent', 
                color: lead.internal_tag ? 'var(--text-color)' : 'var(--text-color)', 
                opacity: lead.internal_tag ? 0.8 : 0.4,
                border: lead.internal_tag ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
              }}>
                {lead.internal_tag || 'No Tag'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.7 }}>
              Step {lead.current_step + 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onPause(lead.id); }}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: 6, 
                  border: '1px solid var(--border-color)', 
                  background: lead.status === 'paused' ? 'color-mix(in srgb, var(--accent-color), transparent 90%)' : 'transparent', 
                  color: lead.status === 'paused' ? 'var(--accent-color)' : 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {lead.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
