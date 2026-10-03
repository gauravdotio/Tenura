import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, ChevronDown, Plus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { Installment, Liability } from '../lib/finance/types';
import { DEFAULT_EMI_DAY, planProgress } from '../lib/finance/calc';
import { dateInMonth, daysBetween, formatDate, formatMonthKey, formatRelativeDays, toISODate, toMonthKey } from '../lib/finance/dates';
import { KIND_LABEL, formatINR, pluralize } from '../lib/format';
import { Badge, Button, Card, EmptyState, MemberAvatar, PageHeader, Progress, Segmented, cx } from '../components/ui';
import { Glow, IssuerMark, Ring } from '../components/Visuals';

export function EmiSchedulesPage({ focusId }: { focusId?: string }) {
  const { data, scoped, scope, installmentsByLiability } = useFinance();
  const openDialog = useOpenDialog();
  const [show, setShow] = useState<'active' | 'closed'>(() => {
    const focused = data.liabilities.find((l) => l.id === focusId);
    return focused?.status === 'closed' ? 'closed' : 'active';
  });

  const plans = useMemo(
    () =>
      scoped.liabilities
        .filter((l) => (installmentsByLiability.get(l.id)?.length ?? 0) > 0)
        .filter((l) => (show === 'closed' ? l.status === 'closed' : l.status !== 'closed'))
        .map((l) => ({ l, inst: installmentsByLiability.get(l.id)! }))
        .sort((a, b) => (planProgress(a.inst).nextDue?.dueMonth ?? '9999').localeCompare(planProgress(b.inst).nextDue?.dueMonth ?? '9999')),
    [scoped.liabilities, installmentsByLiability, show],
  );

  const totals = plans.reduce(
    (t, { inst }) => {
      const p = planProgress(inst);
      return { left: t.left + p.remainingAmount, paid: t.paid + p.paidAmount };
    },
    { left: 0, paid: 0 },
  );
  const overallPct = totals.left + totals.paid > 0 ? (totals.paid / (totals.left + totals.paid)) * 100 : 0;
  const nextDebit = useMemo(() => {
    let best: { date: string; amount: number; name: string } | undefined;
    for (const { l, inst } of plans) {
      const n = planProgress(inst).nextDue;
      if (!n) continue;
      const date = dateInMonth(n.dueMonth, l.dueDay ?? DEFAULT_EMI_DAY);
      if (!best || date < best.date) best = { date, amount: n.amount, name: l.provider };
    }
    return best;
  }, [plans]);
  const monthlyTotal = plans.reduce((s, { l, inst }) => s + (planProgress(inst).remainingAmount > 0 ? l.emiAmount ?? 0 : 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="EMI schedules"
        description="Month-by-month repayment plans. Tick off each instalment as it’s debited."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'liability' })}>New EMI or loan</Button>}
      />

      {show === 'active' && plans.length > 0 && (
        <Card className="relative mb-8 overflow-hidden">
          <Glow />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <Ring percent={overallPct} size={128} label={`${Math.round(overallPct)}% of all EMI plans repaid`}>
              <span className="num text-2xl font-semibold text-ink">{Math.round(overallPct)}%</span>
              <span className="text-[11px] text-ink-faint">repaid</span>
            </Ring>
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
              <HeroStat label="Left to pay" value={formatINR(totals.left)} />
              <HeroStat label="Paid so far" value={formatINR(totals.paid)} tone="positive" />
              <HeroStat label="EMIs per month" value={formatINR(monthlyTotal)} sub={pluralize(plans.length, 'active plan')} />
              {nextDebit && (
                <HeroStat
                  label="Next debit"
                  value={formatINR(nextDebit.amount)}
                  sub={`${nextDebit.name} · ${formatRelativeDays(daysBetween(toISODate(new Date()), nextDebit.date))}`}
                />
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={show} onChange={setShow} options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Completed' }]} />
        {plans.length > 0 && show === 'active' && (
          <p className="text-sm text-ink-muted">
            <span className="num font-semibold text-ink">{formatINR(totals.left)}</span> left across {pluralize(plans.length, 'plan')}
          </p>
        )}
      </div>

      {plans.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title={show === 'closed' ? 'No completed plans yet' : 'No active EMI plans'}
            description={show === 'closed' ? 'Plans move here once every instalment is paid.' : 'Add a loan or EMI purchase with a tenure, or convert a credit card balance to EMI, and its schedule appears here.'}
            action={show === 'active' ? <Button variant="primary" onClick={() => openDialog({ type: 'liability' })}>Add an EMI</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map(({ l, inst }) => (
            <PlanCard key={l.id} liability={l} installments={inst} focused={l.id === focusId} showMember={scope === 'all' && data.members.length > 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ liability: l, installments, focused, showMember }: { liability: Liability; installments: Installment[]; focused: boolean; showMember: boolean }) {
  const { memberMap, setInstallmentPaid } = useFinance();
  const [expanded, setExpanded] = useState(focused);
  const [busy, setBusy] = useState<string | null>(null);
  const p = planProgress(installments);
  const member = memberMap.get(l.memberId);
  const thisMonth = toMonthKey(new Date());
  const done = p.remainingAmount === 0;

  useEffect(() => {
    if (focused) document.getElementById(`plan-${l.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focused, l.id]);

  async function toggle(i: Installment) {
    setBusy(i.id);
    try {
      await setInstallmentPaid(i, !i.paidOn);
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card id={`plan-${l.id}`} className={cx('scroll-mt-20 transition-shadow', focused && 'ring-2 ring-accent/50')}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <IssuerMark name={l.provider} size="sm" />
            <h2 className="truncate text-[15px] font-semibold text-ink">{l.provider}</h2>
            {showMember && member && <MemberAvatar member={member} size="sm" />}
            <Badge>{l.status === 'converted' ? 'Card EMI' : KIND_LABEL[l.kind]}</Badge>
            {done && <Badge tone="positive"><Check className="h-3 w-3" /> Paid off</Badge>}
          </div>
          <p className="num mt-1 text-[13px] text-ink-muted">
            {formatINR(l.emiAmount ?? 0)} × {p.totalCount} months
            {l.interestRate ? ` · ${l.interestRate}% p.a.` : ' · no-cost'}
            {p.lastMonth && ` · ends ${formatMonthKey(p.lastMonth)}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:flex sm:items-center">
          <div>
            <p className="text-xs text-ink-faint">Left to pay</p>
            <p className="num text-[15px] font-semibold text-ink">{formatINR(p.remainingAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Paid</p>
            <p className="num text-[15px] font-semibold text-positive">{formatINR(p.paidAmount)}</p>
          </div>
        </div>

        {p.nextDue && (
          <Button variant="primary" size="sm" loading={busy === p.nextDue.id} onClick={() => toggle(p.nextDue!)} icon={<Check className="h-3.5 w-3.5" />}>
            Pay {formatMonthKey(p.nextDue.dueMonth, { short: true })}
          </Button>
        )}
      </div>

      <div className="px-5">
        <Progress value={p.percent} tone={done ? 'positive' : 'accent'} label={`${l.provider} progress`} />
        <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
          <span className="num">{p.paidCount} of {p.totalCount} paid</span>
          <span className="num">{p.percent}%</span>
        </div>
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={`plan-months-${l.id}`}
        className="mt-3 flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        {expanded ? 'Hide' : 'Show'} monthly schedule
        <ChevronDown className={cx('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div id={`plan-months-${l.id}`} className="grid grid-cols-2 gap-2 border-t border-line p-4 sm:grid-cols-3 lg:grid-cols-4">
          {installments.map((i) => {
            const overdue = !i.paidOn && i.dueMonth < thisMonth;
            const current = !i.paidOn && i.dueMonth === thisMonth;
            return (
              <button
                key={i.id}
                onClick={() => toggle(i)}
                disabled={busy === i.id}
                aria-pressed={Boolean(i.paidOn)}
                aria-label={`${formatMonthKey(i.dueMonth)}, ${formatINR(i.amount)}, ${i.paidOn ? 'paid' : overdue ? 'overdue' : 'unpaid'}. Toggle paid.`}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60',
                  i.paidOn
                    ? 'border-transparent bg-positive-soft'
                    : overdue
                      ? 'border-negative/40 bg-negative-soft/60 hover:border-negative'
                      : current
                        ? 'border-accent/50 hover:border-accent'
                        : 'border-line hover:border-line-strong',
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                    i.paidOn ? 'border-positive bg-positive text-white' : 'border-line-strong bg-surface',
                  )}
                  aria-hidden
                >
                  {i.paidOn && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">
                    <span className="text-ink-faint">#{i.seq}</span> {formatMonthKey(i.dueMonth, { short: true })}
                  </span>
                  <span className={cx('num block text-xs', i.paidOn ? 'text-positive' : overdue ? 'text-negative' : 'text-ink-muted')}>
                    {i.paidOn ? `Paid ${formatDate(i.paidOn)}` : overdue ? `Overdue · ${formatINR(i.amount)}` : formatINR(i.amount)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function HeroStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'positive' }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cx('num mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl', tone === 'positive' ? 'text-positive' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
