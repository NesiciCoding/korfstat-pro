import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white border-transparent',
  secondary: 'bg-[var(--surface-2)] hover:bg-[var(--border-default)] text-[var(--text-primary)] border-[var(--border-default)]',
  danger:    'bg-[var(--brand-danger)] hover:bg-[var(--brand-danger-hover)] text-white border-transparent',
  ghost:     'bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-secondary)] border-transparent',
  outline:   'bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border-default)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] border',
        'transition-all duration-[var(--transition-fast)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin shrink-0" />}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
