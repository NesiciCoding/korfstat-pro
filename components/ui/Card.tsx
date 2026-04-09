import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ children, className = '', noPadding = false, ...props }, ref) => (
  <div
    ref={ref}
    className={[
      'bg-[var(--surface-1)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]',
      !noPadding && 'p-4',
      className,
    ].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = 'Card';

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={['px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]', className].join(' ')} {...props}>
    {children}
  </div>
);

const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={['p-4', className].join(' ')} {...props}>
    {children}
  </div>
);

const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={['px-4 pb-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2', className].join(' ')} {...props}>
    {children}
  </div>
);

export { Card, CardHeader, CardBody, CardFooter };
