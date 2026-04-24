import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, onBack, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div className="flex items-center gap-3 min-w-0">
      {onBack && (
        <button
          onClick={onBack}
          className="flex-none p-2 -ml-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="min-w-0">
        <h1
          className="font-bold text-[var(--text-primary)] truncate"
          style={{ fontSize: 'var(--text-h1)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[var(--text-muted)] mt-0.5 truncate"
            style={{ fontSize: 'var(--text-sm)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex-none flex items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
