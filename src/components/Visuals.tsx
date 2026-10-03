import type { ReactNode } from 'react';
import type { ExpenseCategory } from '../lib/finance/types';
import { CATEGORY_STYLE, issuerGradient, issuerInitials } from '../lib/visuals';
import { Card, Progress, cx } from './ui';

/** Rounded square in a lender's/insurer's colours with its initials. */
export function IssuerMark({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8 text-[10px] rounded-lg', md: 'h-10 w-10 text-[11px] rounded-xl', lg: 'h-12 w-12 text-xs rounded-xl' }[size];
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center font-bold tracking-wide text-white shadow-sm ring-1 ring-black/5', dims)}
      style={{ background: issuerGradient(name) }}
      aria-hidden
    >
      {issuerInitials(name)}
    </span>
  );
}

/** Category icon in a tinted circle. */
export function CategoryIcon({ category, size = 'md' }: { category: ExpenseCategory; size?: 'sm' | 'md' }) {
  const { icon: Icon, color } = CATEGORY_STYLE[category];
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full', size === 'sm' ? 'h-7 w-7' : 'h-9 w-9')}
      style={{ background: `${color}1f`, color }}
      aria-hidden
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
}

const TINT = {
  accent: 'bg-accent-soft text-accent',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  positive: 'bg-positive-soft text-positive',
  neutral: 'bg-surface-sunken text-ink-muted',
};
export type Tint = keyof typeof TINT;

/** Compact metric tile with a tinted icon, used in every page's summary band. */
export function StatCard({
  icon,
  tint,
  label,
  value,
  foot,
  bar,
}: {
  icon: ReactNode;
  tint: Tint;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  bar?: { value: number; tone: 'accent' | 'positive' | 'warning' | 'negative' };
}) {
  return (
    <Card className="flex flex-col p-4 transition-shadow hover:shadow-lg sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4', TINT[tint])}>{icon}</span>
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      </div>
      <p className="num mt-3 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
      {bar && <Progress value={bar.value} tone={bar.tone} className="mt-2.5" label={label} />}
      {foot && <p className="mt-2 text-xs text-ink-muted">{foot}</p>}
    </Card>
  );
}

export function StatBand({ children }: { children: ReactNode }) {
  return <section aria-label="Summary" className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">{children}</section>;
}

/** Circular progress ring. */
export function Ring({ percent, size = 112, stroke = 9, color = 'rgb(var(--positive))', label, children }: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  label: string;
  children?: ReactNode;
}) {
  const r = 50 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--surface-sunken))" strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Decorative soft glows for hero cards. */
export function Glow({ className }: { className?: string }) {
  return (
    <>
      <div className={cx('pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl', className)} aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-positive/10 blur-3xl" aria-hidden />
    </>
  );
}
