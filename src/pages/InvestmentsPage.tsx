import { useMemo, useState } from 'react';
import { CalendarClock, LifeBuoy, Pencil, Plus, Repeat, Trash2, TrendingUp } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { Investment } from '../lib/finance/types';
import { BALANCE_KINDS, MARKET_LINKED, currentValue, investedSoFar, maturityValue, monthlyContribution, portfolioSummary } from '../lib/finance/calc';
import { buildMoneyPlan } from '../lib/finance/advisor';
import { daysBetween, formatDate, toISODate } from '../lib/finance/dates';
import { FREQUENCY_SUFFIX, INVESTMENT_KIND_LABEL, INVESTMENT_STATUS_LABEL, formatINR, formatINRCompact } from '../lib/format';
import { INVESTMENT_STYLE } from '../lib/visuals';
import { Glow, Ring } from '../components/Visuals';
import { Badge, Button, Card, ConfirmDialog, EmptyState, MemberAvatar, PageHeader, Progress, cx } from '../components/ui';
import { RowMenu } from '../components/ui/Menu';

export function InvestmentsPage() {
  const { data, scoped, scope, memberMap, removeInvestment } = useFinance();
  const openDialog = useOpenDialog();
  const [toDelete, setToDelete] = useState<Investment | null>(null);
  const today = toISODate(new Date());

  const portfolio = useMemo(() => portfolioSummary(scoped.investments, today), [scoped.investments, today]);
  const plan = useMemo(() => buildMoneyPlan(scoped), [scoped]);
  const investments = useMemo(
    () =>
      [...scoped.investments].sort((a, b) => {
        const order = ['active', 'paused', 'matured', 'closed'];
        return order.indexOf(a.status) - order.indexOf(b.status) || currentValue(b, today) - currentValue(a, today);
      }),
    [scoped.investments, today],
  );
  const showMember = scope === 'all' && data.members.length > 1;
  const months = plan.emergencyMonths ?? 0;
  const positive = portfolio.gain >= 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Investments"
        description="SIPs, FDs, RDs, PPF, EPF, gold and savings — what you own, next to what you owe."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'investment' })}>Add investment</Button>}
      />

      {investments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="h-5 w-5" />}
            title="No investments yet"
            description="Add your SIPs, FDs, RDs, PPF and savings. The money planner uses them to check your emergency fund and spot cheap savings that could close expensive loans."
            action={<Button variant="primary" onClick={() => openDialog({ type: 'investment' })}>Add investment</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Hero */}
          <Card className="relative mb-6 overflow-hidden">
            <Glow />
            <div className="relative grid lg:grid-cols-[1.6fr_1fr]">
              <div className="p-6 sm:p-8">
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
                  <span className="h-2 w-2 rounded-full bg-positive" aria-hidden /> Portfolio value
                </p>
                <p className="num mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{formatINR(portfolio.value)}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                  <span>Invested <span className="num font-medium text-ink">{formatINR(portfolio.invested)}</span></span>
                  <span className={cx('num font-medium', positive ? 'text-positive' : 'text-negative')}>
                    {positive ? '+' : '−'}{formatINR(Math.abs(portfolio.gain))} ({positive ? '+' : '−'}{Math.abs(portfolio.gainPct).toFixed(1)}%)
                  </span>
                  {portfolio.monthlyContributions > 0 && (
                    <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5" /> <span className="num font-medium text-ink">{formatINR(portfolio.monthlyContributions)}</span>/month going in</span>
                  )}
                </p>

                <div className="mt-7">
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Portfolio by type">
                    {portfolio.byKind.filter((k) => k.value > 0).map((k) => (
                      <div key={k.kind} className="h-full transition-[flex-grow] duration-700 first:rounded-l-full last:rounded-r-full" style={{ flexGrow: k.value, background: INVESTMENT_STYLE[k.kind].color }} title={`${INVESTMENT_KIND_LABEL[k.kind]}: ${formatINR(k.value)}`} />
                    ))}
                  </div>
                  <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    {portfolio.byKind.filter((k) => k.value > 0).map((k) => (
                      <li key={k.kind}>
                        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                          <span className="h-2 w-2 rounded-sm" style={{ background: INVESTMENT_STYLE[k.kind].color }} aria-hidden /> {INVESTMENT_KIND_LABEL[k.kind].replace(' (lump sum)', '')}
                        </p>
                        <p className="num mt-0.5 text-sm font-semibold text-ink">
                          {formatINRCompact(k.value)}
                          <span className="ml-1 text-xs font-normal text-ink-faint">{Math.round((k.value / Math.max(1, portfolio.value)) * 100)}%</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-line p-6 sm:p-8 lg:border-l lg:border-t-0">
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink-muted"><LifeBuoy className="h-4 w-4" /> Emergency fund</p>
                <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start xl:flex-row xl:items-center">
                  <Ring percent={(months / 6) * 100} color={months >= 6 ? 'rgb(var(--positive))' : months >= 3 ? 'rgb(var(--warning))' : 'rgb(var(--negative))'} label={`${months.toFixed(1)} of 6 months covered`}>
                    <span className="num text-2xl font-semibold text-ink">{months.toFixed(1)}</span>
                    <span className="text-[11px] text-ink-faint">months</span>
                  </Ring>
                  <div className="min-w-0 text-sm">
                    <p className="num font-semibold text-ink">{formatINR(plan.emergencyPot)}</p>
                    <p className="mt-1 text-ink-muted">
                      {plan.emergencyMonths === undefined
                        ? 'Add expenses or EMIs to see how long this lasts.'
                        : months >= 6
                          ? 'Six months of essentials covered — well done.'
                          : `Aim for 6 months of essentials (${formatINRCompact((plan.cash.spending + plan.cash.emis + plan.cash.premiums) * 6)}).`}
                    </p>
                    <p className="mt-2 text-xs text-ink-faint">Savings accounts and anything you mark as your emergency fund count here.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            {investments.map((inv) => {
              const style = INVESTMENT_STYLE[inv.kind];
              const Icon = style.icon;
              const value = currentValue(inv, today);
              const put = investedSoFar(inv, today);
              const gain = value - put;
              const atMaturity = maturityValue(inv, today);
              const perMonth = monthlyContribution(inv);
              const m = memberMap.get(inv.memberId);
              const term = inv.startDate && inv.maturityDate ? Math.max(1, daysBetween(inv.startDate, inv.maturityDate)) : undefined;
              const elapsed = term && inv.startDate ? Math.min(term, Math.max(0, daysBetween(inv.startDate, today))) : 0;
              const isBalance = BALANCE_KINDS.includes(inv.kind) && inv.invested > 0;
              const estimated = inv.currentValue === undefined && !isBalance && !MARKET_LINKED.includes(inv.kind) && (inv.interestRate ?? 0) > 0 && inv.startDate;
              return (
                <Card key={inv.id} className={cx('flex flex-col overflow-hidden transition-shadow hover:shadow-lg', inv.status === 'closed' && 'opacity-60')}>
                  <div className="relative px-5 pb-5 pt-4 text-white" style={{ background: `linear-gradient(120deg, ${style.from} 0%, ${style.to} 100%)` }}>
                    <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10" aria-hidden />
                    <Icon className="pointer-events-none absolute bottom-2 right-4 h-14 w-14 text-white/10" aria-hidden />
                    <div className="relative flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white/75">{INVESTMENT_KIND_LABEL[inv.kind]}{inv.provider && ` · ${inv.provider}`}</p>
                        <h2 className="mt-0.5 truncate text-[15px] font-semibold">{inv.name}</h2>
                      </div>
                      {inv.emergencyFund && <span className="flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-medium"><LifeBuoy className="h-3 w-3" /> Emergency</span>}
                      {inv.status !== 'active' && <Badge>{INVESTMENT_STATUS_LABEL[inv.status]}</Badge>}
                      <span className="rounded-lg bg-white/90">
                        <RowMenu
                          label={`Actions for ${inv.name}`}
                          items={[
                            { label: 'Edit', icon: <Pencil />, onSelect: () => openDialog({ type: 'investment', investment: inv }) },
                            { label: 'Delete', icon: <Trash2 />, tone: 'danger', onSelect: () => setToDelete(inv) },
                          ]}
                        />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <dl className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                        <dt className="text-xs text-ink-faint">{isBalance ? 'Balance' : 'Invested'}</dt>
                        <dd className="num mt-0.5 text-sm font-semibold text-ink">{formatINR(put)}</dd>
                      </div>
                      <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                        <dt className="text-xs text-ink-faint">{estimated ? 'Value today (est.)' : 'Value today'}</dt>
                        <dd className="num mt-0.5 text-sm font-semibold text-ink">
                          {formatINR(value)}
                          {Math.abs(gain) >= 1 && put > 0 && (
                            <span className={cx('ml-1.5 text-xs font-medium', gain >= 0 ? 'text-positive' : 'text-negative')}>
                              {gain >= 0 ? '+' : '−'}{((Math.abs(gain) / put) * 100).toFixed(1)}%
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>

                    {term !== undefined && inv.status === 'active' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-ink-muted">
                          <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Matures {formatDate(inv.maturityDate!)}</span>
                          {atMaturity !== undefined && <span>≈ <span className="num font-semibold text-positive">{formatINR(atMaturity)}</span></span>}
                        </div>
                        <Progress value={(elapsed / term) * 100} tone="positive" className="mt-2" label="Time to maturity" />
                      </div>
                    )}

                    <div className="mt-4 flex flex-1 flex-wrap items-end justify-between gap-2 text-xs text-ink-muted">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {perMonth > 0 && inv.contribution && (
                          <span className="flex items-center gap-1"><Repeat className="h-3.5 w-3.5 text-ink-faint" /> <span className="num font-medium text-ink">{formatINR(inv.contribution)}</span>{FREQUENCY_SUFFIX[inv.frequency ?? 'monthly']}</span>
                        )}
                        {inv.interestRate !== undefined && inv.interestRate > 0 && <span>{inv.interestRate}% p.a.</span>}
                        {inv.startDate && <span>Since {formatDate(inv.startDate)}</span>}
                      </span>
                      {showMember && m && <span className="flex items-center gap-1.5"><MemberAvatar member={m} size="sm" /> {m.name}</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-ink-faint">
            FD, RD and PPF values are estimated from the rate and dates you entered (interest compounded quarterly). For SIPs, shares and gold, enter the current value from your app — Tenura doesn't fetch market prices.
          </p>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await removeInvestment(toDelete.id);
          } catch {
            /* toast shown */
          }
          setToDelete(null);
        }}
        title={`Delete ${toDelete?.name ?? 'investment'}?`}
        description="It will be removed from your portfolio and money plan."
      />
    </div>
  );
}
