import { useMemo, useState } from 'react';
import { ArrowRight, Banknote, CalendarRange, Pencil, PiggyBank, Plus, Scale, Trash2, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { Income } from '../lib/finance/types';
import { PAYMENTS_PER_YEAR, monthlyIncome } from '../lib/finance/calc';
import { buildMoneyPlan } from '../lib/finance/advisor';
import { FREQUENCY_SUFFIX, INCOME_KIND_LABEL, formatINR, formatINRCompact } from '../lib/format';
import { INCOME_STYLE, MEMBER_HEX } from '../lib/visuals';
import { href } from '../lib/router';
import { StatBand, StatCard } from '../components/Visuals';
import { CashFlowBar } from '../components/MoneyVisuals';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, MemberAvatar, PageHeader, cx } from '../components/ui';
import { RowMenu } from '../components/ui/Menu';

export function IncomePage() {
  const { data, scoped, scope, memberMap, removeIncome } = useFinance();
  const openDialog = useOpenDialog();
  const [toDelete, setToDelete] = useState<Income | null>(null);

  const plan = useMemo(() => buildMoneyPlan(scoped), [scoped]);
  const incomes = useMemo(
    () => [...scoped.incomes].sort((a, b) => Number(b.isActive) - Number(a.isActive) || monthlyIncome(b) - monthlyIncome(a)),
    [scoped.incomes],
  );
  const { cash } = plan;
  const commitments = cash.emis + cash.premiums;
  const emiPct = plan.emiToIncome ?? 0;

  // Who brings in what (whole household only)
  const byMember = useMemo(() => {
    const totals = new Map<string, number>();
    for (const i of scoped.incomes) totals.set(i.memberId, (totals.get(i.memberId) ?? 0) + monthlyIncome(i));
    return [...totals.entries()].map(([id, amount]) => ({ member: memberMap.get(id), amount })).filter((x) => x.member && x.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [scoped.incomes, memberMap]);
  const showMembers = scope === 'all' && data.members.length > 1;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Income"
        description="Take-home pay, rent, pension and other money coming in — the base for your money plan."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'income' })}>Add income</Button>}
      />

      {incomes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Banknote className="h-5 w-5" />}
            title="Add your income"
            description="Your salary and other income let Tenura show how much goes to EMIs, how much you can save, and how fast you can become debt-free."
            action={<Button variant="primary" onClick={() => openDialog({ type: 'income' })}>Add income</Button>}
          />
        </Card>
      ) : (
        <>
          <StatBand>
            <StatCard icon={<Wallet />} tint="accent" label="Monthly take-home" value={formatINR(cash.income)} foot={`${incomes.filter((i) => i.isActive).length} active source${incomes.filter((i) => i.isActive).length === 1 ? '' : 's'}`} />
            <StatCard icon={<CalendarRange />} tint="neutral" label="Yearly income" value={formatINRCompact(cash.income * 12)} foot="After tax, at today's pay" />
            <StatCard
              icon={<Scale />}
              tint={emiPct > 40 ? 'negative' : emiPct > 30 ? 'warning' : 'positive'}
              label="Goes to EMIs & premiums"
              value={`${Math.round(cash.income ? (commitments / cash.income) * 100 : 0)}%`}
              foot={`${formatINR(commitments)} a month`}
              bar={{ value: cash.income ? (commitments / cash.income) * 100 : 0, tone: emiPct > 40 ? 'negative' : emiPct > 30 ? 'warning' : 'positive' }}
            />
            <StatCard
              icon={<PiggyBank />}
              tint={cash.surplus < 0 ? 'negative' : 'positive'}
              label={cash.surplus < 0 ? 'Short each month' : 'Left each month'}
              value={formatINR(Math.abs(cash.surplus))}
              foot={cash.spendingMonths ? `After investing and avg. spending (${cash.spendingMonths} mo)` : 'Add expenses for a truer figure'}
            />
          </StatBand>

          <Card className="mb-6">
            <CardHeader
              title="Where your monthly income goes"
              description={cash.spendingMonths ? `Spending is your average over the last ${cash.spendingMonths} month${cash.spendingMonths === 1 ? '' : 's'} of expenses.` : 'Add expenses to include your day-to-day spending.'}
              action={
                <a href={href('/app/planner')} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                  See your money plan <ArrowRight className="h-3.5 w-3.5" />
                </a>
              }
            />
            <div className="px-5 pb-6 pt-5">
              <CashFlowBar cash={cash} />
            </div>
          </Card>

          {showMembers && byMember.length > 1 && (
            <Card className="mb-6 p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold text-ink">Who earns what</h2>
              <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Income by family member">
                {byMember.map(({ member, amount }) => (
                  <div key={member!.id} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: amount, background: MEMBER_HEX[member!.color] }} title={`${member!.name}: ${formatINR(amount)}`} />
                ))}
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                {byMember.map(({ member, amount }) => (
                  <li key={member!.id} className="flex items-center gap-2.5">
                    <MemberAvatar member={member!} />
                    <span>
                      <span className="block text-sm font-medium text-ink">{member!.name}</span>
                      <span className="num block text-xs text-ink-muted">{formatINR(amount)}/mo · {Math.round((amount / cash.income) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {incomes.map((i) => {
              const { icon: Icon, color } = INCOME_STYLE[i.kind];
              const m = memberMap.get(i.memberId);
              return (
                <Card key={i.id} className={cx('group relative overflow-hidden p-5 transition-shadow hover:shadow-lg', !i.isActive && 'opacity-60')}>
                  <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.08]" style={{ background: color }} aria-hidden />
                  <div className="relative flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{i.source}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                        {INCOME_KIND_LABEL[i.kind]}
                        {!i.isActive && <Badge>Stopped</Badge>}
                      </p>
                    </div>
                    <RowMenu
                      label={`Actions for ${i.source}`}
                      items={[
                        { label: 'Edit', icon: <Pencil />, onSelect: () => openDialog({ type: 'income', income: i }) },
                        { label: 'Delete', icon: <Trash2 />, tone: 'danger', onSelect: () => setToDelete(i) },
                      ]}
                    />
                  </div>
                  <p className="num relative mt-5 text-2xl font-semibold tracking-tight text-ink">
                    {formatINR(i.amount)}
                    <span className="text-sm font-normal text-ink-faint">{FREQUENCY_SUFFIX[i.frequency]}</span>
                  </p>
                  <div className="relative mt-1 flex items-center justify-between text-xs text-ink-muted">
                    <span>{i.frequency !== 'monthly' ? `≈ ${formatINR((i.amount * PAYMENTS_PER_YEAR[i.frequency]) / 12)} a month` : `${formatINRCompact(i.amount * 12)} a year`}</span>
                    {showMembers && m && (
                      <span className="flex items-center gap-1.5"><MemberAvatar member={m} size="sm" /> {m.name}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await removeIncome(toDelete.id);
          } catch {
            /* toast shown */
          }
          setToDelete(null);
        }}
        title={`Delete ${toDelete?.source ?? 'income'}?`}
        description="It will no longer count towards your money plan."
      />
    </div>
  );
}
