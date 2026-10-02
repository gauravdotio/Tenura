import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Repeat, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { ExpenseCategory } from '../lib/finance/types';
import { spendingByCategory } from '../lib/finance/calc';
import { addMonthsToKey, formatDate, formatMonthKey, toMonthKey } from '../lib/finance/dates';
import { CATEGORY_LABEL, formatINR, pluralize } from '../lib/format';
import { Badge, Button, Card, CardHeader, EmptyState, IconButton, MemberAvatar, PageHeader, Progress, Select } from '../components/ui';

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
                          {showMember && m && <MemberAvatar member={m} size="sm" />}
                          <button className="min-w-0 flex-1 text-left" onClick={() => openDialog({ type: 'expense', expense: e })}>
                            <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                              {e.title}
                              {e.isRecurring && <Repeat className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-label="Recurring" />}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-faint">{CATEGORY_LABEL[e.category]} · {e.paymentMethod}</p>
                          </button>
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
          <Card className="p-5">
            <p className="text-[13px] font-medium text-ink-muted">Spent in {formatMonthKey(month)}</p>
            <p className="num mt-2 text-[28px] font-semibold leading-none tracking-tight text-ink">{formatINR(total)}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {pluralize(monthExpenses.length, 'expense')}
              {recurring > 0 && <> · <span className="num">{formatINR(recurring)}</span> recurring</>}
            </p>
            {budget > 0 && month === currentMonth && (
              <div className="mt-4">
                <Progress value={pct} tone={pct > 100 ? 'negative' : pct > 85 ? 'warning' : 'accent'} label="Budget used" />
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-ink-muted">Budget {formatINR(budget)}</span>
                  {pct > 100 ? <Badge tone="negative">{formatINR(total - budget)} over</Badge> : <span className="num text-ink-muted">{formatINR(budget - total)} left</span>}
                </div>
              </div>
            )}
          </Card>
          {categories.length > 0 && (
            <Card>
              <CardHeader title="By category" />
              <ul className="space-y-3 px-5 pb-5 pt-4">
                {categories.map((c) => (
                  <li key={c.category}>
                    <button className="w-full text-left" onClick={() => setCategory(category === c.category ? 'all' : (c.category as ExpenseCategory))} aria-pressed={category === c.category}>
                      <div className="flex justify-between text-[13px]">
                        <span className={category === c.category ? 'font-medium text-ink' : 'text-ink-muted'}>{CATEGORY_LABEL[c.category as ExpenseCategory]}</span>
                        <span className="num font-medium text-ink">{formatINR(c.amount)}</span>
                      </div>
                      <Progress value={(c.amount / categories[0].amount) * 100} className="mt-1.5 h-1" label={`${CATEGORY_LABEL[c.category as ExpenseCategory]} share`} />
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
