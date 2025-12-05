'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'onAnimationEnd'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const variants = {
  primary: 'bg-[#FFE500] text-[#0A0A0F] hover:bg-[#FFE500]/90',
  secondary: 'bg-[#2D1B69] text-white hover:bg-[#2D1B69]/90',
  accent: 'bg-[#FF2E6C] text-white hover:bg-[#FF2E6C]/90',
  ghost: 'bg-transparent border border-[#FAFAF5]/30 text-[#FAFAF5] hover:bg-[#FAFAF5]/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, type = 'button', onClick, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={`
          font-semibold rounded-lg transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
        disabled={disabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
