'use client';

import { useState, useEffect } from 'react';

interface TimerProps {
  targetTimestamp: number;
  onDue?: () => void;
  style?: React.CSSProperties;
  className?: string;
  prefix?: string;
}

export default function Timer({ targetTimestamp, onDue, style, className, prefix = 'Next message in' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = targetTimestamp - now;
      if (diff <= 0) {
        setTimeLeft(0);
        if (onDue) onDue();
        return;
      }
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, onDue]);

  if (timeLeft <= 0) return null;

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const hours   = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const days    = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

  const pad = (n: number) => String(n).padStart(2, '0');

  let timeString = '';
  if (days > 0) timeString += `${days}d `;
  timeString += `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <div 
      className={className} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 6,
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--accent-color)',
        ...style 
      }}
    >
      <span style={{ opacity: 0.6 }}>{prefix}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{timeString}</span>
    </div>
  );
}
