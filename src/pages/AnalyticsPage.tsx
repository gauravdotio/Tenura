import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarCheck, Flame, TrendingDown, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { outstandingFor, projectBurndown, projectOutflow, spendingByCategory } from '../lib/finance/calc';
import { formatMonthKey, toMonthKey } from '../lib/finance/dates';
import type { ExpenseCategory } from '../lib/finance/types';
import { CATEGORY_LABEL, formatINR, formatINRCompact } from '../lib/format';
import { Card, CardHeader, EmptyState, MemberAvatar, PageHeader } from '../components/ui';
import { CategoryIcon, IssuerMark, StatBand, StatCard } from '../components/Visuals';

const axis = { stroke: 'var(--chart-axis)', fontSize: 12, tickLine: false, axisLine: false } as const;

interface TipProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color: string }[];
}

function ChartTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-ink">{label && /^\d{4}-\d{2}$/.test(label) ? formatMonthKey(label) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-6 text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} /> {p.name}
          </span>
          <span className="num font-medium text-ink">{formatINR(p.value)}</span>
        </p>
      ))}
      {payload.length > 1 && (
        <p className="mt-1.5 flex justify-between gap-6 border-t border-line pt-1.5 font-medium text-ink">
          <span>Total</span>
          <span className="num">{formatINR(total)}</span>
        </p>
      )}
    </div>
  );
}

function RankedBars({ rows }: { rows: { key: string; label: React.ReactNode; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="space-y-3.5 px-5 pb-5 pt-4">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="num shrink-0 text-ink-muted">
              <span className="font-medium text-ink">{formatINR(r.value)}</span> · {Math.round((r.value / total) * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-surface-sunken">
            <div className="h-2 rounded-full bg-[var(--chart-1)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const { data, scoped, scope, summary, installmentsByLiability } = useFinance();
  const today = useMemo(() => new Date(), []);

  const outflow = useMemo(() => projectOutflow(scoped, today, 12), [scoped, today]);
  const burndown = useMemo(() => projectBurndown(scoped, today, 12), [scoped, today]);
  const hasOutflow = outflow.some((r) => r.emi + r.premiums > 0);

  const byLender = useMemo(
    () =>
      scoped.liabilities
        .map((l) => ({ key: l.id, label: <span className="flex items-center gap-2"><IssuerMark name={l.provider} size="sm" /> {l.provider}</span>, value: outstandingFor(l, installmentsByLiability.get(l.id) ?? []) }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [scoped.liabilities, installmentsByLiability],
  );

  const byMember = useMemo(
    () =>
      data.members
        .map((m) => ({
          key: m.id,
          label: (
            <span className="flex items-center gap-2">
              <MemberAvatar member={m} size="sm" /> {m.name}
            </span>
          ),
          value: data.liabilities.filter((l) => l.memberId === m.id).reduce((s, l) => s + outstandingFor(l, installmentsByLiability.get(l.id) ?? []), 0),
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value),
    [data, installmentsByLiability],
  );

  const categories = useMemo(
    () =>
      spendingByCategory(scoped.expenses, toMonthKey(today)).map((c) => ({
        key: c.category,
        label: <span className="flex items-center gap-2"><CategoryIcon category={c.category as ExpenseCategory} size="sm" /> {CATEGORY_LABEL[c.category as ExpenseCategory]}</span>,
        value: c.amount,
      })),
    [scoped.expenses, today],
  );

  const nothing = !hasOutflow && byLender.length === 0 && categories.length === 0;
  const avgOutflow = outflow.reduce((s, r) => s + r.emi + r.premiums, 0) / Math.max(1, outflow.length);
  const peak = outflow.reduce<(typeof outflow)[number] | undefined>((best, r) => (!best || r.emi + r.premiums > best.emi + best.premiums ? r : best), undefined);
  const cleared = (burndown[0]?.balance ?? 0) - (burndown.at(-1)?.balance ?? 0);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analytics" description="Where your money is committed over the next year." />

      {!nothing && (
        <StatBand>
          <StatCard icon={<Wallet />} tint="accent" label="Avg. monthly outflow" value={formatINR(Math.round(avgOutflow))} foot="EMIs + premiums, next 12 months" />
          <StatCard icon={<Flame />} tint="warning" label="Heaviest month" value={peak ? formatINR(peak.emi + peak.premiums) : '—'} foot={peak ? formatMonthKey(peak.month) : undefined} />
          <StatCard icon={<TrendingDown />} tint="positive" label="Cleared in 12 months" value={formatINR(Math.max(0, cleared))} foot={burndown[0]?.balance ? `${Math.round((cleared / burndown[0].balance) * 100)}% of today’s debt` : undefined} />
          <StatCard icon={<CalendarCheck />} tint="neutral" label="EMIs finish" value={summary.debtFreeMonth ? formatMonthKey(summary.debtFreeMonth) : '—'} foot="if every EMI is paid on time" />
        </StatBand>
      )}

      {nothing ? (
        <Card>
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Not enough data yet" description="Add loans, EMIs, policies or expenses and the charts will fill in." />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader title="Monthly outflow — next 12 months" description="Scheduled EMIs and insurance premiums. Overdue EMIs are counted in this month." />
            <div className="flex gap-4 px-5 pt-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]" /> EMIs</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-2)]" /> Premiums</span>
            </div>
            <div className="h-72 px-2 pb-4 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outflow} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" {...axis} tickFormatter={(m: string) => formatMonthKey(m, { short: true })} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis {...axis} width={52} tickFormatter={(v: number) => formatINRCompact(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--ink) / 0.04)' }} />
                  <Bar dataKey="emi" name="EMIs" stackId="o" fill="var(--chart-1)" stroke="rgb(var(--surface))" strokeWidth={2} />
                  <Bar dataKey="premiums" name="Premiums" stackId="o" fill="var(--chart-2)" stroke="rgb(var(--surface))" strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Debt burndown" description="What you’ll still owe at the end of each month if every EMI is paid on time. Card balances stay until you pay them." />
            <div className="h-64 px-2 pb-4 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="burn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" {...axis} tickFormatter={(m: string, i: number) => (i === 0 ? 'Now' : formatMonthKey(m, { short: true }))} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis {...axis} width={52} tickFormatter={(v: number) => formatINRCompact(v)} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="balance" name="Outstanding" stroke="var(--chart-1)" strokeWidth={2} fill="url(#burn)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Outstanding by lender" description={byLender.length ? `Top ${byLender.length}` : undefined} />
            {byLender.length ? <RankedBars rows={byLender} /> : <p className="px-5 py-8 text-sm text-ink-muted">No outstanding debt. 🎉</p>}
          </Card>

          {scope === 'all' && byMember.length > 1 ? (
            <Card>
              <CardHeader title="Outstanding by member" />
              <RankedBars rows={byMember} />
            </Card>
          ) : (
            <Card>
              <CardHeader title={`Spending by category — ${formatMonthKey(toMonthKey(today))}`} />
              {categories.length ? <RankedBars rows={categories} /> : <p className="px-5 py-8 text-sm text-ink-muted">No spending logged this month.</p>}
            </Card>
          )}

          {scope === 'all' && byMember.length > 1 && categories.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader title={`Spending by category — ${formatMonthKey(toMonthKey(today))}`} />
              <RankedBars rows={categories} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
