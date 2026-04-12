'use client';

import { useState } from 'react';

interface MessageBubbleProps {
  stepNumber: number;
  messageText: string;
  hasBeenSent: boolean;
  sentTimestamp?: string;
  isCurrentTarget: boolean;
  phoneNumber: string;
  onMarkSent: (stepNumber: number) => void;
  fmtDate: (date: string) => string;
}

export default function MessageBubble({
  stepNumber,
  messageText,
  hasBeenSent,
  sentTimestamp,
  isCurrentTarget,
  phoneNumber,
  onMarkSent,
  fmtDate
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState(messageText);

  const generateWhatsAppLink = (phone: string, message: string) => {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8, 
        padding: '12px', 
        borderRadius: 16, 
        background: isExpanded ? 'var(--surface-color)' : isCurrentTarget ? 'color-mix(in srgb, var(--accent-color), transparent 95%)' : 'transparent',
        border: isExpanded ? '1px solid var(--accent-color)' : isCurrentTarget ? '1px solid var(--accent-color)' : '1px solid transparent',
        boxShadow: isCurrentTarget ? '0 0 15px color-mix(in srgb, var(--accent-color), transparent 80%)' : 'none',
        transition: 'all 0.2s ease',
        cursor: isExpanded ? 'default' : 'pointer'
      }}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: isCurrentTarget ? 'var(--accent-color)' : 'var(--text-color)', opacity: hasBeenSent || isCurrentTarget ? 1 : 0.5 }}>
          Message {stepNumber}
        </div>
        {hasBeenSent && sentTimestamp && (
          <div style={{ fontSize: 11, color: 'var(--accent-color)', opacity: 0.8 }}>✓ {fmtDate(sentTimestamp)}</div>
        )}
      </div>

      {!isExpanded ? (
        <div 
          style={{ 
            fontSize: 13, 
            lineHeight: 1.5, 
            color: 'var(--text-color)', 
            opacity: hasBeenSent ? 1 : 0.7,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap'
          }}
        >
          {text}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: 120, 
              background: 'var(--bg-color)', 
              color: 'var(--text-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 10, 
              padding: 10, 
              fontSize: 13, 
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} 
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-color)', fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <a 
              href={generateWhatsAppLink(phoneNumber, text)} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => {
                e.stopPropagation();
                onMarkSent(stepNumber);
              }}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 10, 
                background: 'var(--accent-color)', 
                color: 'var(--bg-color)', 
                fontSize: 12, 
                fontWeight: 700, 
                textDecoration: 'none', 
                cursor: 'pointer' 
              }}
            >
              Confirm & Open WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
