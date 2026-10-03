import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Repeat, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { ExpenseCategory } from '../lib/finance/types';
import { spendingByCategory } from '../lib/finance/calc';
import { addMonthsToKey, formatDate, formatMonthKey, toMonthKey } from '../lib/finance/dates';
import { CATEGORY_LABEL, formatINR, pluralize } from '../lib/format';
import { Badge, Button, Card, CardHeader, EmptyState, IconButton, MemberAvatar, PageHeader, Select, cx } from '../components/ui';
import { CategoryIcon, Glow, Ring } from '../components/Visuals';
import { CATEGORY_STYLE } from '../lib/visuals';

export function ExpensesPage() {
  const { data, scoped, scope, summary, memberMap, removeExpense } = useFinance();
  const openDialog = useOpenDialog();
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all');
  const currentMonth = toMonthKey(new Date());

  const monthExpenses = useMemo(() => scoped.expenses.filter((e) => e.date.startsWith(month)), [scoped.expenses, month]);
  const visible = useMemo(
    () => monthExpenses.filter((e) => category === 'all' || e.category === category).sort((a, b) => b.date.localeCompare(a.date)),
    [monthExpenses, category],
  );
  const byDay = useMemo(() => {
    const groups = new Map<string, typeof visible>();
    for (const e of visible) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);
    return [...groups.entries()];
  }, [visible]);

  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const recurring = monthExpenses.filter((e) => e.isRecurring).reduce((s, e) => s + e.amount, 0);
  const categories = useMemo(() => spendingByCategory(scoped.expenses, month), [scoped.expenses, month]);
  const budget = summary.monthlyBudget;
  const pct = budget > 0 ? (total / budget) * 100 : 0;
  const showMember = scope === 'all' && data.members.length > 1;
  const trend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => addMonthsToKey(month, i - 5));
    return months.map((m) => ({ month: m, total: scoped.expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0) }));
  }, [scoped.expenses, month]);
  const trendMax = Math.max(...trend.map((t) => t.total), 1);
  const prevTotal = trend[4]?.total ?? 0;
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : undefined;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Expenses"
        description="Day-to-day spending, bills and subscriptions."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'expense' })}>Add expense</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-card">
          <IconButton label="Previous month" onClick={() => setMonth((m) => addMonthsToKey(m, -1))}><ChevronLeft className="h-4 w-4" /></IconButton>
          <span className="min-w-[96px] text-center text-sm font-medium text-ink">{formatMonthKey(month)}</span>
          <IconButton label="Next month" onClick={() => setMonth((m) => addMonthsToKey(m, 1))} disabled={month >= currentMonth} className="disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-auto min-w-[180px]" aria-label="Filter by category">
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <Card className="relative mb-6 overflow-hidden">
        <Glow />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_1.2fr] lg:items-center">
          {budget > 0 && month === currentMonth ? (
            <Ring percent={pct} size={120} color={pct > 100 ? 'rgb(var(--negative))' : pct > 85 ? 'rgb(var(--warning))' : 'rgb(var(--accent))'} label={`${Math.round(pct)}% of monthly budget used`}>
              <span className="num text-xl font-semibold text-ink">{Math.round(pct)}%</span>
              <span className="text-[11px] text-ink-faint">of budget</span>
            </Ring>
          ) : null}
          <div>
            <p className="text-[13px] font-medium text-ink-muted">Spent in {formatMonthKey(month)}</p>
            <p className="num mt-2 text-4xl font-semibold tracking-tight text-ink">{formatINR(total)}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <span>{pluralize(monthExpenses.length, 'expense')}</span>
              {recurring > 0 && <span>· <span className="num">{formatINR(recurring)}</span> recurring</span>}
              {change !== undefined && (
                <Badge tone={change > 0 ? 'warning' : 'positive'}>{change > 0 ? '▲' : '▼'} {Math.abs(Math.round(change))}% vs last month</Badge>
              )}
            </p>
            {budget > 0 && month === currentMonth && (
              <p className="mt-2 text-xs text-ink-muted">
                Budget {formatINR(budget)} · {pct > 100 ? <span className="font-medium text-negative">{formatINR(total - budget)} over</span> : <span className="num">{formatINR(budget - total)} left</span>}
              </p>
            )}
          </div>
          <div aria-label="Spending over the last six months">
            <p className="mb-2 text-xs font-medium text-ink-muted">Last 6 months</p>
            <div className="flex h-28 items-end gap-2">
              {trend.map((t) => (
                <button
                  key={t.month}
                  onClick={() => setMonth(t.month)}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  aria-label={`${formatMonthKey(t.month)}: ${formatINR(t.total)}`}
                  aria-pressed={t.month === month}
                >
                  <span className="num text-[10px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">{t.total ? formatINR(t.total) : ''}</span>
                  <span
                    className={cx('w-full rounded-t-md transition-[height,background-color] duration-500', t.month === month ? 'bg-accent' : 'bg-accent/25 group-hover:bg-accent/45')}
                    style={{ height: `${Math.max(4, (t.total / trendMax) * 100)}%` }}
                  />
                  <span className={cx('text-[11px]', t.month === month ? 'font-medium text-ink' : 'text-ink-faint')}>{formatMonthKey(t.month, { short: true }).split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="order-2 lg:order-1">
          {visible.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-5 w-5" />}
              title={monthExpenses.length ? 'Nothing in this category' : `No expenses in ${formatMonthKey(month)}`}
              description="Log groceries, bills, fuel and anything else to see where the month goes."
              action={<Button variant="primary" onClick={() => openDialog({ type: 'expense' })}>Add expense</Button>}
            />
          ) : (
            <div>
              {byDay.map(([day, items]) => (
                <section key={day}>
                  <h3 className="sticky top-14 z-10 flex justify-between border-b border-line bg-surface/95 px-5 py-2 text-xs font-medium text-ink-faint backdrop-blur first:rounded-t-2xl lg:top-0">
                    <span>{formatDate(day)}</span>
                    <span className="num">{formatINR(items.reduce((s, e) => s + e.amount, 0))}</span>
                  </h3>
                  <ul className="divide-y divide-line">
                    {items.map((e) => {
                      const m = memberMap.get(e.memberId);
                      return (
                        <li key={e.id} className="group flex items-center gap-3 px-5 py-3">
                          <CategoryIcon category={e.category} />
                          <button className="min-w-0 flex-1 text-left" onClick={() => openDialog({ type: 'expense', expense: e })}>
                            <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                              {e.title}
                              {e.isRecurring && <Repeat className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-label="Recurring" />}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-faint">{CATEGORY_LABEL[e.category]} · {e.paymentMethod}</p>
                          </button>
                          {showMember && m && <MemberAvatar member={m} size="sm" />}
                          <span className="num text-sm font-semibold text-ink">{formatINR(e.amount)}</span>
                          <div className="flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <IconButton label={`Edit ${e.title}`} onClick={() => openDialog({ type: 'expense', expense: e })}><Pencil className="h-3.5 w-3.5" /></IconButton>
                            <IconButton label={`Delete ${e.title}`} tone="danger" onClick={() => void removeExpense(e.id).catch(() => {})}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <div className="order-1 space-y-4 lg:order-2">
          {categories.length > 0 && (
            <Card>
              <CardHeader title="By category" />
              <ul className="space-y-3 px-5 pb-5 pt-4">
                {categories.map((c) => (
                  <li key={c.category}>
                    <button className="w-full text-left" onClick={() => setCategory(category === c.category ? 'all' : (c.category as ExpenseCategory))} aria-pressed={category === c.category}>
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={c.category as ExpenseCategory} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between text-[13px]">
                            <span className={category === c.category ? 'font-medium text-ink' : 'text-ink-muted'}>{CATEGORY_LABEL[c.category as ExpenseCategory]}</span>
                            <span className="num font-medium text-ink">{formatINR(c.amount)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-surface-sunken">
                            <div className="h-1.5 rounded-full transition-[width] duration-500" style={{ width: `${(c.amount / categories[0].amount) * 100}%`, background: CATEGORY_STYLE[c.category as ExpenseCategory].color }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
