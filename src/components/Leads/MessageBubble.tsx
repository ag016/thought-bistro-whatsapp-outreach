'use client';

import { useState } from 'react';
import Timer from '@/components/UI/Timer';

interface MessageBubbleProps {
  stepNumber?: number; // Optional — templates won't have it
  title?: string;
  messageText: string;
  hasBeenSent?: boolean;
  sentTimestamp?: string;
  isCurrentTarget?: boolean;
  nextDueTimestamp?: number;
  phoneNumber: string;
  onMarkSent?: (stepNumber?: number) => void;
  fmtDate?: (date: string) => void; // Unused but kept for structure
  generateWhatsAppLink: (phone: string, text: string) => string;
}

export default function MessageBubble({
  stepNumber,
  title,
  messageText,
  hasBeenSent,
  sentTimestamp,
  isCurrentTarget,
  nextDueTimestamp,
  phoneNumber,
  onMarkSent,
  fmtDate,
  generateWhatsAppLink
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState(messageText);
  // Track whether WA was opened (but message not yet confirmed as sent)
  const [waOpened, setWaOpened] = useState(false);

  const displayTitle = title || (stepNumber ? `Message ${stepNumber}` : 'Template');

  const handleOpenWhatsApp = () => {
    setWaOpened(true);
  };

  const handleMarkSent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkSent) onMarkSent(stepNumber);
    setWaOpened(false);
    setIsExpanded(false);
  };

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-2xl transition-enterprise cursor-pointer ${
        isExpanded
          ? 'bg-slate-800 border-2 border-emerald-500 shadow-lg ring-1 ring-emerald-500/20'
          : isCurrentTarget
            ? 'bg-emerald-500/5 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:scale-[1.01]'
            : 'bg-transparent border-2 border-transparent hover:scale-[1.01]'
      }`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="flex justify-between items-center mb-1">
        <div className={`text-xs font-bold transition-colors ${
          isCurrentTarget || !stepNumber ? 'text-emerald-500' : 'text-slate-300 opacity-70'
        }`}>
          {displayTitle}
        </div>
        {hasBeenSent && sentTimestamp && (
          <div className="text-[10px] text-emerald-500 font-medium opacity-80">✓ Sent</div>
        )}
        {!hasBeenSent && isCurrentTarget && !isExpanded && (
          <>
            {nextDueTimestamp && nextDueTimestamp > Date.now() ? (
              <Timer targetTimestamp={nextDueTimestamp} prefix="Due in" />
            ) : (
              <div className="text-[10px] text-emerald-400 font-semibold animate-pulse">● Due Now</div>
            )}
          </>
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
        <div className="flex flex-col gap-3 animate-fade-in" onClick={e => e.stopPropagation()}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field w-full min-h-[120px] resize-vertical py-2 px-3"
            style={{ fontSize: 13, lineHeight: 1.6 }}
          />

          {/* Step 1: Open WhatsApp */}
          {!waOpened ? (
            <div className="flex gap-2 justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); setWaOpened(false); }}
                className="transition-enterprise px-3 py-2 rounded-lg border border-white/10 bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600"
              >
                Cancel
              </button>
              <a
                href={generateWhatsAppLink(phoneNumber, text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); handleOpenWhatsApp(); }}
                className="btn-primary transition-enterprise px-4 py-2 text-xs font-bold flex items-center gap-2"
                style={{ background: 'var(--info-color)', color: 'var(--bg-color)', borderRadius: 10, textDecoration: 'none' }}
              >
                Open WhatsApp ↗
              </a>
            </div>
          ) : (
            /* Step 2: Confirm the message was actually sent */
            <div className="flex flex-col gap-2">
              <div
                className="text-xs text-center py-2 px-3 rounded-lg"
                style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}
              >
                ⚠️ Did you send the message on WhatsApp?
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setWaOpened(false); }}
                  className="transition-enterprise px-3 py-2 rounded-lg border border-white/10 bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600"
                >
                  I didn't send it
                </button>
                <button
                  onClick={handleMarkSent}
                  className="transition-enterprise px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-lg"
                  style={{ background: 'var(--accent-color)', color: 'var(--bg-color)' }}
                >
                  ✓ Mark as Sent
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
