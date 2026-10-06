import type { CashFlow } from '../lib/finance/advisor';
import { formatINR, formatINRCompact } from '../lib/format';
import { cx } from './ui';

const SEGMENTS: { key: keyof CashFlow; label: string; color: string }[] = [
  { key: 'emis', label: 'EMIs', color: 'var(--chart-2)' },
  { key: 'premiums', label: 'Premiums', color: 'var(--chart-4)' },
  { key: 'investing', label: 'Investing', color: 'var(--chart-1)' },
  { key: 'spending', label: 'Spending', color: 'var(--chart-5)' },
];

/** Where a month's take-home goes: EMIs, premiums, investing, spending and what's left (or the shortfall). */
export function CashFlowBar({ cash, className }: { cash: CashFlow; className?: string }) {
  const outflow = cash.emis + cash.premiums + cash.investing + cash.spending;
  const left = cash.income - outflow;
  // Scale to whichever is bigger so a shortfall still fits on the bar
  const scale = Math.max(cash.income, outflow, 1);
  const parts = [
    ...SEGMENTS.map((s) => ({ ...s, value: Number(cash[s.key]) })),
    left >= 0
      ? { key: 'left', label: 'Left over', color: 'var(--chart-3)', value: left }
      : { key: 'short', label: 'Short by', color: 'rgb(var(--negative))', value: -left },
  ];

  return (
    <div className={className}>
      <div className="relative flex h-4 gap-0.5 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label="How monthly income is used">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div
            key={p.key}
            className={cx('h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full', p.key === 'short' && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,.25)_4px,rgba(255,255,255,.25)_8px)]')}
            style={{ width: `${(p.value / scale) * 100}%`, backgroundColor: p.color }}
            title={`${p.label}: ${formatINR(p.value)}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        {parts.map((p) => (
          <li key={p.key} className={cx(!p.value && 'opacity-45')}>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} aria-hidden /> {p.label}
            </p>
            <p className={cx('num mt-0.5 text-sm font-semibold', p.key === 'short' ? 'text-negative' : p.key === 'left' ? 'text-positive' : 'text-ink')}>
              {formatINRCompact(p.value)}
              {cash.income > 0 && p.value > 0 && <span className="ml-1 text-xs font-normal text-ink-faint">{Math.round((p.value / cash.income) * 100)}%</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small line chart of a series of balances, no axes. */
export function Sparkline({ series, height = 120, className }: { series: { values: number[]; color: string; label: string; dashed?: boolean }[]; height?: number; className?: string }) {
  const w = 600;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const len = Math.max(2, ...series.map((s) => s.values.length));
  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (len - 1)) * w).toFixed(1)},${(height - 4 - (v / max) * (height - 8)).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cx('w-full', className)} style={{ height }} role="img" aria-label={series.map((s) => s.label).join(' vs ')}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke="var(--chart-grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {series.map((s) => (
        <path key={s.label} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? '6 5' : undefined} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
