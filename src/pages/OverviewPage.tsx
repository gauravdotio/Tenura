import { useMemo } from 'react';
import { ArrowRight, CreditCard, Receipt, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import { planProgress, upcomingPayments } from '../lib/finance/calc';
import { formatDate, formatMonthKey, toISODate } from '../lib/finance/dates';
import { CATEGORY_LABEL, formatINR, formatINRCompact, pluralize } from '../lib/format';
import { href } from '../lib/router';
import { DueList } from '../components/DueList';
import { StatTile } from '../components/StatTile';
import { Button, Card, CardHeader, MemberAvatar, Progress } from '../components/ui';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function OverviewPage() {
  const { user } = useAuth();
  const { data, scoped, summary, scope, memberMap, installmentsByLiability, loadSampleData } = useFinance();
  const openDialog = useOpenDialog();
  const today = toISODate(new Date());

  const due = useMemo(() => upcomingPayments(scoped, today, 30), [scoped, today]);
  const dueTotal = due.reduce((s, d) => s + d.amount, 0);
  const overdue = due.filter((d) => d.days < 0).length;

  const plans = useMemo(
    () =>
      scoped.liabilities
        .filter((l) => l.status !== 'closed' && (installmentsByLiability.get(l.id)?.length ?? 0) > 0)
        .map((l) => ({ l, p: planProgress(installmentsByLiability.get(l.id)!) }))
        .sort((a, b) => b.p.remainingAmount - a.p.remainingAmount)
        .slice(0, 5),
    [scoped.liabilities, installmentsByLiability],
  );

  const recent = useMemo(() => [...scoped.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [scoped.expenses]);
  const isEmpty = data.liabilities.length === 0 && data.expenses.length === 0 && data.policies.length === 0;
  const scopeName = scope === 'all' ? 'your household' : memberMap.get(scope)?.name;
  const firstName = user?.name.split(' ')[0];
  const budgetPct = summary.monthlyBudget > 0 ? (summary.spentThisMonth / summary.monthlyBudget) * 100 : 0;
  const totalPlanned = summary.repaid + summary.outstanding;

  if (isEmpty) return <Onboarding name={firstName} onSample={loadSampleData} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <p className="text-sm text-ink-muted">{formatDate(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {due.length > 0 ? (
            <>
              {pluralize(due.length, 'payment')} worth <span className="num font-medium text-ink">{formatINR(dueTotal)}</span> due in the next 30 days for {scopeName}
              {overdue > 0 && <span className="text-negative"> — {overdue} overdue</span>}.
            </>
          ) : (
            <>Nothing due in the next 30 days for {scopeName}. Nice.</>
          )}
        </p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Outstanding debt"
          tone="negative"
          value={formatINR(summary.outstanding)}
          footer={
            <span>
              {formatINRCompact(summary.creditCardOutstanding)} on cards · {formatINRCompact(summary.loanOutstanding)} in loans & EMIs
            </span>
          }
        />
        <StatTile
          label="Monthly commitments"
          tone="accent"
          value={formatINR(summary.monthlyEmi + summary.monthlyPremiums)}
          footer={
            <span>
              {formatINRCompact(summary.monthlyEmi)} EMIs · {formatINRCompact(summary.monthlyPremiums)} premiums / mo
            </span>
          }
        />
        <StatTile
          label="Repaid so far"
          tone="positive"
          value={formatINR(summary.repaid)}
          footer={
            <div className="space-y-2">
              <Progress value={totalPlanned ? (summary.repaid / totalPlanned) * 100 : 0} tone="positive" label="Share of debt repaid" />
              <span>{summary.debtFreeMonth ? `EMIs end ${formatMonthKey(summary.debtFreeMonth)}` : `${pluralize(summary.closedCount, 'account')} paid off`}</span>
            </div>
          }
        />
        <StatTile
          label="Spent this month"
          value={formatINR(summary.spentThisMonth)}
          footer={
            summary.monthlyBudget > 0 ? (
              <div className="space-y-2">
                <Progress value={budgetPct} tone={budgetPct > 100 ? 'negative' : budgetPct > 85 ? 'warning' : 'accent'} label="Budget used" />
                <span>
                  {budgetPct > 100
                    ? `${formatINR(summary.spentThisMonth - summary.monthlyBudget)} over the ${formatINRCompact(summary.monthlyBudget)} budget`
                    : `${formatINR(summary.monthlyBudget - summary.spentThisMonth)} left of ${formatINRCompact(summary.monthlyBudget)}`}
                </span>
              </div>
            ) : (
              <a href={href('/app/household')} className="text-accent hover:underline">Set a monthly budget</a>
            )
          }
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader
            title="Coming up"
            description="EMIs, card bills and premiums due in the next 30 days"
            action={due.length > 0 ? <span className="num text-sm font-semibold text-ink">{formatINR(dueTotal)}</span> : undefined}
          />
          <div className="mt-3">
            <DueList items={due} showMember={scope === 'all' && data.members.length > 1} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="EMI plans"
            description={plans.length ? `${pluralize(summary.activePlanCount, 'active plan')}` : 'No active EMI plans'}
            action={
              <a href={href('/app/emis')} className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                All <ArrowRight className="h-3.5 w-3.5" />
              </a>
            }
          />
          <ul className="mt-2 space-y-1 px-2 pb-3">
            {plans.map(({ l, p }) => (
              <li key={l.id}>
                <a href={href(`/app/emis?plan=${l.id}`)} className="block rounded-xl px-3 py-3 hover:bg-surface-sunken">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-ink">{l.provider}</span>
                    <span className="num shrink-0 text-xs text-ink-muted">
                      {p.paidCount}/{p.totalCount} paid
                    </span>
                  </div>
                  <Progress value={p.percent} className="mt-2" label={`${l.provider} progress`} />
                  <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
                    <span className="num">{formatINR(p.remainingAmount)} left</span>
                    {p.lastMonth && <span>ends {formatMonthKey(p.lastMonth)}</span>}
                  </div>
                </a>
              </li>
            ))}
            {plans.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-ink-muted">
                Add a loan or EMI with a tenure to get a month-by-month schedule.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent spending"
          action={
            <a href={href('/app/expenses')} className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              All expenses <ArrowRight className="h-3.5 w-3.5" />
            </a>
          }
        />
        {recent.length === 0 ? (
          <div className="px-5 pb-6 pt-3 text-sm text-ink-muted">
            No expenses yet.{' '}
            <button onClick={() => openDialog({ type: 'expense' })} className="font-medium text-accent hover:underline">Add one</button>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {recent.map((e) => {
              const m = memberMap.get(e.memberId);
              return (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  {m && <MemberAvatar member={m} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{e.title}</p>
                    <p className="text-xs text-ink-faint">{CATEGORY_LABEL[e.category]} · {formatDate(e.date)}</p>
                  </div>
                  <span className="num text-sm font-medium text-ink">{formatINR(e.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Onboarding({ name, onSample }: { name?: string; onSample: () => Promise<void> }) {
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
      <Card className="mt-4 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Sparkles className="h-4 w-4" /></span>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-ink">Just looking around?</h2>
          <p className="text-sm text-ink-muted">Fill your account with a sample household — you can clear it any time from Settings.</p>
        </div>
        <Button onClick={() => void onSample()}>Load sample data</Button>
      </Card>
    </div>
  );
}
