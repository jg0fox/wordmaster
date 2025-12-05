'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'outline';
}

const variants = {
  default: 'bg-[#FAFAF5]/5 border border-[#FAFAF5]/10',
  glow: 'bg-[#FAFAF5]/5 border border-[#FFE500]/30 shadow-[0_0_20px_rgba(255,229,0,0.2)]',
  outline: 'bg-transparent border-2 border-[#FAFAF5]/20',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-xl p-6
          ${variants[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
