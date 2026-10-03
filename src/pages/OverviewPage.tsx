import { useMemo } from 'react';
import { ArrowRight, CreditCard, Plus, Receipt, ShieldCheck, TrendingDown, UserPlus, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import {
  creditTotals,
  debtMix,
  isOpenCard,
  monthEmiProgress,
  planProgress,
  spendingByCategory,
  upcomingPayments,
  utilizationTone,
  type DebtGroup,
} from '../lib/finance/calc';
import { formatDate, formatMonthKey, toISODate, toMonthKey } from '../lib/finance/dates';
import type { ExpenseCategory } from '../lib/finance/types';
import { CATEGORY_LABEL, formatINR, formatINRCompact, pluralize } from '../lib/format';
import { href } from '../lib/router';
import { DueList } from '../components/DueList';
import { CardTile } from '../components/CardsGallery';
import { Button, Card, CardHeader, MemberAvatar, Progress, cx } from '../components/ui';
import { CategoryIcon, Glow, Ring, StatCard } from '../components/Visuals';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const MIX: { key: DebtGroup; label: string; color: string }[] = [
  { key: 'cards', label: 'Credit cards', color: 'var(--chart-1)' },
  { key: 'loans', label: 'Loans', color: 'var(--chart-2)' },
  { key: 'emis', label: 'EMIs', color: 'var(--chart-3)' },
  { key: 'bnpl', label: 'Pay later', color: 'var(--chart-4)' },
];

export function OverviewPage() {
  const { user } = useAuth();
  const { data, scoped, summary, scope, memberMap, installmentsByLiability } = useFinance();
  const openDialog = useOpenDialog();
  const now = useMemo(() => new Date(), []);
  const today = toISODate(now);
  const thisMonth = toMonthKey(now);

  const due = useMemo(() => upcomingPayments(scoped, today, 30), [scoped, today]);
  const dueTotal = due.reduce((s, d) => s + d.amount, 0);
  const overdue = due.filter((d) => d.days < 0).length;
  const mix = useMemo(() => debtMix(scoped), [scoped]);
  const month = useMemo(() => monthEmiProgress(scoped, thisMonth), [scoped, thisMonth]);
  const credit = useMemo(() => creditTotals(scoped), [scoped]);
  const cards = useMemo(() => scoped.liabilities.filter(isOpenCard).sort((a, b) => b.balance - a.balance), [scoped.liabilities]);
  const categories = useMemo(() => spendingByCategory(scoped.expenses, thisMonth).slice(0, 5), [scoped.expenses, thisMonth]);

  const plans = useMemo(
    () =>
      scoped.liabilities
        .filter((l) => l.status !== 'closed' && (installmentsByLiability.get(l.id)?.length ?? 0) > 0)
        .map((l) => ({ l, p: planProgress(installmentsByLiability.get(l.id)!) }))
        .sort((a, b) => b.p.remainingAmount - a.p.remainingAmount)
        .slice(0, 4),
    [scoped.liabilities, installmentsByLiability],
  );

  const recent = useMemo(() => [...scoped.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [scoped.expenses]);
  const isEmpty = data.liabilities.length === 0 && data.expenses.length === 0 && data.policies.length === 0;
  const scopeName = scope === 'all' ? 'your household' : memberMap.get(scope)?.name;
  const firstName = user?.name.split(' ')[0];
  const budgetPct = summary.monthlyBudget > 0 ? (summary.spentThisMonth / summary.monthlyBudget) * 100 : 0;
  const repaidPct = summary.repaid + summary.outstanding > 0 ? (summary.repaid / (summary.repaid + summary.outstanding)) * 100 : 0;
  const mixTotal = MIX.reduce((s, m) => s + mix[m.key], 0);
  const showMember = scope === 'all' && data.members.length > 1;

  if (isEmpty) return <Onboarding name={firstName} />;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{formatDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {due.length > 0 ? (
              <>
                {pluralize(due.length, 'payment')} worth <span className="num font-medium text-ink">{formatINR(dueTotal)}</span> due in the next 30 days for {scopeName}
                {overdue > 0 && <span className="font-medium text-negative"> · {overdue} overdue</span>}
              </>
            ) : (
              <>Nothing due in the next 30 days for {scopeName}. Nice.</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon={<Receipt className="h-4 w-4" />} onClick={() => openDialog({ type: 'expense' })}>Expense</Button>
          <Button size="sm" variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'liability' })}>Loan or card</Button>
        </div>
      </div>

      {/* Hero: what you owe + this month */}
      <Card className="relative overflow-hidden">
        <Glow />
        <div className="relative grid lg:grid-cols-[1.5fr_1fr]">
          <div className="p-6 sm:p-8">
            <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
              <span className="h-2 w-2 rounded-full bg-negative" aria-hidden /> Total outstanding
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              <span className="num">{formatINR(summary.outstanding)}</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {summary.debtFreeMonth && (
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-positive" /> EMIs finish by <span className="font-medium text-ink">{formatMonthKey(summary.debtFreeMonth)}</span>
                </span>
              )}
              <span>
                <span className="num font-medium text-positive">{formatINR(summary.repaid)}</span> repaid ({Math.round(repaidPct)}%)
              </span>
            </p>

            {mixTotal > 0 && (
              <div className="mt-7">
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Outstanding by type">
                  {MIX.filter((m) => mix[m.key] > 0).map((m) => (
                    <div key={m.key} className="h-full transition-[flex-grow] duration-700 first:rounded-l-full last:rounded-r-full" style={{ flexGrow: mix[m.key], background: m.color }} title={`${m.label}: ${formatINR(mix[m.key])}`} />
                  ))}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  {MIX.map((m) => (
                    <li key={m.key} className={cx(!mix[m.key] && 'opacity-45')}>
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} aria-hidden /> {m.label}
                      </p>
                      <p className="num mt-0.5 text-sm font-semibold text-ink">{formatINRCompact(mix[m.key])}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center border-t border-line p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-[13px] font-medium text-ink-muted">{formatMonthKey(thisMonth)} EMIs</p>
            {month.count > 0 ? (
              <div className="mt-4 flex items-center gap-6">
                <Ring percent={month.percent} label={`${Math.round(month.percent)}% of this month’s EMIs paid`}>
                  <span className="num text-xl font-semibold text-ink">{month.paidCount}/{month.count}</span>
                  <span className="text-[11px] text-ink-faint">paid</span>
                </Ring>
                <dl className="flex-1 space-y-2.5 text-sm">
                  <Row label="Due this month" value={formatINR(month.due)} />
                  <Row label="Paid" value={formatINR(month.paid)} tone="positive" />
                  <Row label="Still to pay" value={formatINR(month.due - month.paid)} strong />
                </dl>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">No EMIs fall due this month.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={<Wallet className="h-4 w-4" />} tint="accent" label="Monthly commitments" value={formatINR(summary.monthlyEmi + summary.monthlyPremiums)}
          foot={`${formatINRCompact(summary.monthlyEmi)} EMIs · ${formatINRCompact(summary.monthlyPremiums)} premiums`} />
        <StatCard icon={<CreditCard className="h-4 w-4" />} tint="negative" label="Credit used"
          value={credit.percent !== undefined ? `${Math.round(credit.percent)}%` : formatINR(summary.creditCardOutstanding)}
          foot={credit.percent !== undefined ? `${formatINRCompact(credit.used)} of ${formatINRCompact(credit.limit)} limit` : 'Add card limits to see usage'}
          bar={credit.percent !== undefined ? { value: credit.percent, tone: utilizationTone(credit.percent) } : undefined} />
        <StatCard icon={<Receipt className="h-4 w-4" />} tint="warning" label="Spent this month" value={formatINR(summary.spentThisMonth)}
          foot={summary.monthlyBudget > 0 ? (budgetPct > 100 ? `${formatINRCompact(summary.spentThisMonth - summary.monthlyBudget)} over budget` : `${formatINRCompact(summary.monthlyBudget - summary.spentThisMonth)} left of ${formatINRCompact(summary.monthlyBudget)}`) : 'No budget set'}
          bar={summary.monthlyBudget > 0 ? { value: budgetPct, tone: budgetPct > 100 ? 'negative' : budgetPct > 85 ? 'warning' : 'accent' } : undefined} />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} tint="positive" label="Insurance cover" value={formatINRCompact(summary.sumAssured)}
          foot={`${pluralize(scoped.policies.filter((p) => p.status === 'active').length, 'active policy', 'active policies')}`} />
      </section>

      {/* Coming up + cards & plans */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Coming up"
            description="EMIs, card bills and premiums due in the next 30 days"
            action={due.length > 0 ? <span className="num text-sm font-semibold text-ink">{formatINR(dueTotal)}</span> : undefined}
          />
          <div className="mt-3">
            <DueList items={due} showMember={showMember} />
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {cards.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader title="Credit cards" description={pluralize(cards.length, 'open card')} action={<SeeAll to="/app/liabilities" />} />
              <div className="mt-4 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-5 scrollbar-none">
                {cards.slice(0, 6).map((c) => (
                  <div key={c.id} className="w-[220px] shrink-0 snap-start">
                    <CardTile card={c} compact />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="EMI plans" description={plans.length ? pluralize(summary.activePlanCount, 'active plan') : 'No active EMI plans'} action={<SeeAll to="/app/emis" />} />
            <ul className="mt-2 space-y-1 px-2 pb-3">
              {plans.map(({ l, p }) => (
                <li key={l.id}>
                  <a href={href(`/app/emis?plan=${l.id}`)} className="block rounded-xl px-3 py-3 transition-colors hover:bg-surface-sunken">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-ink">{l.provider}</span>
                      <span className="num shrink-0 text-xs text-ink-muted">{p.paidCount}/{p.totalCount}</span>
                    </div>
                    <Progress value={p.percent} className="mt-2" label={`${l.provider} progress`} />
                    <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
                      <span className="num">{formatINR(p.remainingAmount)} left</span>
                      {p.lastMonth && <span>ends {formatMonthKey(p.lastMonth, { short: true })}</span>}
                    </div>
                  </a>
                </li>
              ))}
              {plans.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-muted">Add a loan or EMI with a tenure to get a schedule.</li>}
            </ul>
          </Card>
        </div>
      </div>

      {/* Spending */}
      <Card>
        <CardHeader title="Spending" description={`${formatMonthKey(thisMonth)} so far`} action={<SeeAll to="/app/expenses" label="All expenses" />} />
        {recent.length === 0 ? (
          <div className="px-5 pb-6 pt-3 text-sm text-ink-muted">
            No expenses yet. <button onClick={() => openDialog({ type: 'expense' })} className="font-medium text-accent hover:underline">Add one</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1.3fr_1fr]">
            <ul className="mt-2 divide-y divide-line">
              {recent.map((e) => {
                const m = memberMap.get(e.memberId);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <CategoryIcon category={e.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{e.title}</p>
                      <p className="text-xs text-ink-faint">{CATEGORY_LABEL[e.category]} · {formatDate(e.date)}</p>
                    </div>
                    {showMember && m && <MemberAvatar member={m} size="sm" />}
                    <span className="num text-sm font-medium text-ink">{formatINR(e.amount)}</span>
                  </li>
                );
              })}
            </ul>
            {categories.length > 0 && (
              <div className="border-t border-line p-5 md:border-l md:border-t-0">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Top categories</p>
                <ul className="mt-4 space-y-3.5">
                  {categories.map((c, i) => (
                    <li key={c.category}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-ink-muted">{CATEGORY_LABEL[c.category as ExpenseCategory]}</span>
                        <span className="num font-medium text-ink">{formatINR(c.amount)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-surface-sunken">
                        <div className="h-1.5 rounded-full transition-[width] duration-700" style={{ width: `${(c.amount / categories[0].amount) * 100}%`, background: `var(--chart-${(i % 8) + 1})` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SeeAll({ to, label = 'All' }: { to: string; label?: string }) {
  return (
    <a href={href(to)} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-accent hover:underline">
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </a>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: 'positive'; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cx('num', strong ? 'font-semibold text-ink' : 'font-medium', tone === 'positive' ? 'text-positive' : !strong && 'text-ink')}>{value}</dd>
    </div>
  );
}

function Onboarding({ name }: { name?: string }) {
  const openDialog = useOpenDialog();
  const steps = [
    { icon: CreditCard, title: 'Add your cards & loans', body: 'Balances, EMIs and tenures — schedules are generated for you.', action: () => openDialog({ type: 'liability' }), cta: 'Add loan or card' },
    { icon: ShieldCheck, title: 'Add LIC & insurance', body: 'Never miss a premium. We remind you before it’s due.', action: () => openDialog({ type: 'policy' }), cta: 'Add policy' },
    { icon: Receipt, title: 'Log daily expenses', body: 'See where the month went against a budget.', action: () => openDialog({ type: 'expense' }), cta: 'Add expense' },
    { icon: UserPlus, title: 'Bring in your family', body: 'Track a parent’s or spouse’s finances under your account.', action: () => openDialog({ type: 'member' }), cta: 'Add member' },
  ];
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">Welcome to Tenura{name ? `, ${name}` : ''}</h1>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Let’s get everything you pay every month in one place. Start with whatever is easiest — you can add the rest later.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <Card key={s.title} className="flex flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-sunken text-ink"><s.icon className="h-4 w-4" /></span>
              <span className="text-xs font-medium text-ink-faint">Step {i + 1}</span>
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-ink">{s.title}</h2>
            <p className="mt-1 flex-1 text-sm text-ink-muted">{s.body}</p>
            <Button className="mt-4 self-start" size="sm" variant={i === 0 ? 'primary' : 'secondary'} onClick={s.action}>{s.cta}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
