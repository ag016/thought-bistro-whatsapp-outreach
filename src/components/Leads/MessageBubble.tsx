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
      className={`flex flex-col gap-2 p-3 rounded-2xl transition-enterprise cursor-pointer hover:scale-[1.01] ${
        isExpanded 
          ? 'bg-slate-800 border-2 border-emerald-500 shadow-lg ring-1 ring-emerald-500/20' 
          : isCurrentTarget 
            ? 'bg-emerald-500/5 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
            : 'bg-transparent border-2 border-transparent'
      }`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="flex justify-between items-center mb-1">
        <div className={`text-xs font-bold transition-colors ${
          isCurrentTarget ? 'text-emerald-500' : 'text-slate-300 opacity-70'
        }`}>
          Message {stepNumber}
        </div>
        {hasBeenSent && sentTimestamp && (
          <div className="text-[10px] text-emerald-500 font-medium opacity-80">✓ {fmtDate(sentTimestamp)}</div>
        )}
      </div>

      {!isExpanded ? (
        <div 
          className={`text-sm leading-relaxed text-slate-300 transition-opacity ${
            hasBeenSent ? 'opacity-100' : 'opacity-60'
          }`}
          style={{ 
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
        <div className="flex flex-col gap-3 animate-fade-in">
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="input-field w-full min-h-[120px] resize-vertical py-2 px-3"
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} 
              className="transition-enterprise px-3 py-2 rounded-lg border border-white/10 bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 transition-colors"
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
              className="btn-primary transition-enterprise px-4 py-2 text-xs font-bold flex items-center gap-2"
            >
              Confirm & Open WhatsApp
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
