'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circle' | 'rect';
}

export const Skeleton = ({ 
  className = '', 
  width, 
  height, 
  variant = 'rect' 
}: SkeletonProps) => {
  const baseStyles: React.CSSProperties = {
    backgroundColor: 'var(--surface-color)',
    backgroundImage: 'linear-gradient(90deg, var(--surface-color) 25%, rgba(255,255,255,0.05) 50%, var(--surface-color) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s infinite linear',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      height: '1rem',
      borderRadius: '0.25rem',
      width: width || '100%',
    },
    circle: {
      borderRadius: '50%',
      width: width || '40px',
      height: height || '40px',
    },
    rect: {
      borderRadius: '0.75rem',
      width: width || '100%',
      height: height || '100%',
    },
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div 
        className={`skeleton-element ${className}`} 
        style={{ ...baseStyles, ...variantStyles[variant] }} 
      />
    </>
  );
};
