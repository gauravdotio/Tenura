import type { ReactNode } from 'react';
import { Card, cx } from './ui';

export function StatTile({
  label,
  value,
  tone = 'neutral',
  footer,
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'negative' | 'positive' | 'accent';
  footer?: ReactNode;
  icon?: ReactNode;
}) {
  const dot = { neutral: 'bg-ink-faint', negative: 'bg-negative', positive: 'bg-positive', accent: 'bg-accent' }[tone];
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
          <span className={cx('h-2 w-2 rounded-full', dot)} aria-hidden />
          {label}
        </p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className="num mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {footer && <div className="mt-3 text-xs text-ink-muted">{footer}</div>}
    </Card>
  );
}
