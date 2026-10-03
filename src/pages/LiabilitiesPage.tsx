import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, CreditCard, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import type { Liability } from '../lib/finance/types';
import { creditTotals, isOpenCard, outstandingFor, planProgress, utilizationTone } from '../lib/finance/calc';
import { formatMonthKey } from '../lib/finance/dates';
import { KIND_LABEL, STATUS_LABEL, formatINR } from '../lib/format';
import { navigate } from '../lib/router';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, MemberAvatar, PageHeader, Progress, Segmented } from '../components/ui';
import { RowMenu } from '../components/ui/Menu';
import { CardsGallery } from '../components/CardsGallery';

type Filter = 'open' | 'cards' | 'loans' | 'closed';

export function LiabilitiesPage() {
  const { data, scoped, scope, memberMap, installmentsByLiability, saveLiability, removeLiability } = useFinance();
  const openDialog = useOpenDialog();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Liability | null>(null);
  const [deleting, setDeleting] = useState(false);
  const showMember = scope === 'all' && data.members.length > 1;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.liabilities
      .filter((l) => {
        if (filter === 'closed') return l.status === 'closed';
        if (l.status === 'closed') return false;
        if (filter === 'cards') return l.kind === 'credit_card';
        if (filter === 'loans') return l.kind !== 'credit_card' || l.status === 'converted';
        return true;
      })
      .filter((l) => !q || l.provider.toLowerCase().includes(q) || l.notes?.toLowerCase().includes(q) || l.cardLast4?.includes(q))
      .map((l) => {
        const inst = installmentsByLiability.get(l.id) ?? [];
        return { l, inst, owed: outstandingFor(l, inst), progress: inst.length ? planProgress(inst) : null };
      })
      .sort((a, b) => b.owed - a.owed);
  }, [scoped.liabilities, installmentsByLiability, filter, query]);

  const totals = rows.reduce(
    (t, r) => ({ owed: t.owed + r.owed, emi: t.emi + (r.progress && r.progress.remainingAmount > 0 ? r.l.emiAmount ?? 0 : 0) }),
    { owed: 0, emi: 0 },
  );
  const openCards = useMemo(() => scoped.liabilities.filter(isOpenCard), [scoped.liabilities]);
  const credit = useMemo(() => creditTotals(scoped), [scoped]);
  const showCards = (filter === 'open' || filter === 'cards') && !query && openCards.length > 0;

  const counts = {
    open: scoped.liabilities.filter((l) => l.status !== 'closed').length,
    closed: scoped.liabilities.filter((l) => l.status === 'closed').length,
  };

  async function markClosed(l: Liability) {
    try {
      await saveLiability({ ...l, status: 'closed' }, 'keep');
      toast.success(`${l.provider} marked as paid off`, {
        label: 'Undo',
        onClick: () => void saveLiability(l, 'keep'),
      });
    } catch {
      /* toast shown */
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeLiability(toDelete.id);
      toast.success(`${toDelete.provider} deleted`);
      setToDelete(null);
    } catch {
      /* toast shown */
    } finally {
      setDeleting(false);
    }
  }

  const actionsFor = (l: Liability, hasSchedule: boolean) => [
    { label: 'Edit', icon: <Pencil />, onSelect: () => openDialog({ type: 'liability', liability: l }) },
    { label: 'View schedule', icon: <CalendarClock />, onSelect: () => navigate(`/app/emis?plan=${l.id}`), hidden: !hasSchedule },
    { label: 'Convert to EMI', icon: <RefreshCw />, onSelect: () => openDialog({ type: 'convert', liability: l }), hidden: !(l.kind === 'credit_card' && l.status === 'active' && l.balance > 0) },
    { label: 'Mark as paid off', icon: <CheckCircle2 />, onSelect: () => void markClosed(l), hidden: l.status === 'closed' },
    { label: 'Delete', icon: <Trash2 />, onSelect: () => setToDelete(l), tone: 'danger' as const },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Loans & cards"
        description="Every credit card balance, loan, consumer EMI and pay-later plan."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'liability' })}>Add loan or card</Button>}
      />

      {showCards && (
        <section aria-labelledby="cards-heading" className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="cards-heading" className="text-[15px] font-semibold text-ink">Credit cards</h2>
              <p className="text-[13px] text-ink-muted">Tap a card to flip it. Card numbers and CVVs are never stored.</p>
            </div>
            {credit.percent !== undefined && (
              <div className="w-full sm:w-auto sm:min-w-[220px] sm:text-right">
                <p className="num text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{formatINR(credit.used)}</span> used of {formatINR(credit.limit)}
                </p>
                <Progress value={credit.percent} tone={utilizationTone(credit.percent)} className="mt-1.5" label="Total credit used" />
                <p className="mt-1 text-xs text-ink-faint">{Math.round(credit.percent)}% overall utilisation</p>
              </div>
            )}
          </div>
          <CardsGallery cards={openCards} />
        </section>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          className="self-start overflow-x-auto scrollbar-none"
          options={[
            { value: 'open', label: `Open · ${counts.open}` },
            { value: 'cards', label: 'Cards' },
            { value: 'loans', label: 'Loans & EMIs' },
            { value: 'closed', label: `Paid off · ${counts.closed}` },
          ]}
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lender, card, note" className="pl-9" aria-label="Search loans and cards" />
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-5 w-5" />}
            title={query ? 'No matches' : filter === 'closed' ? 'Nothing paid off yet' : 'No loans or cards here'}
            description={query ? 'Try a different search.' : filter === 'closed' ? 'Settled loans and cards will be listed here.' : 'Add a credit card balance, a bank loan or an EMI purchase to start tracking it.'}
            action={!query && filter !== 'closed' ? <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'liability' })}>Add loan or card</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-ink-faint">
                  <th scope="col" className="px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="px-3 py-3 font-medium">Type</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Outstanding</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">EMI / month</th>
                  <th scope="col" className="w-48 px-3 py-3 font-medium">Progress</th>
                  <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ l, inst, owed, progress }) => {
                  const m = memberMap.get(l.memberId);
                  return (
                    <tr key={l.id} className="group hover:bg-surface-sunken/50">
                      <td className="px-5 py-3.5">
                        <button className="flex items-center gap-3 text-left" onClick={() => openDialog({ type: 'liability', liability: l })}>
                          {showMember && m && <MemberAvatar member={m} size="sm" />}
                          <span>
                            <span className="block font-medium text-ink group-hover:underline">{l.provider}</span>
                            <span className="block text-xs text-ink-faint">
                              {[l.cardLast4 && `•••• ${l.cardLast4}`, l.dueDay && !inst.length && `Due on the ${ordinal(l.dueDay)}`, l.notes].filter(Boolean).join(' · ') || '—'}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-ink-muted">{KIND_LABEL[l.kind]}</span>
                          {l.status !== 'active' && <Badge tone={l.status === 'closed' ? 'positive' : 'accent'}>{STATUS_LABEL[l.status]}</Badge>}
                        </div>
                      </td>
                      <td className="num px-3 py-3.5 text-right font-semibold text-ink">{formatINR(owed)}</td>
                      <td className="num px-3 py-3.5 text-right text-ink-muted">{l.emiAmount && inst.length ? formatINR(l.emiAmount) : '—'}</td>
                      <td className="px-3 py-3.5">
                        {progress ? (
                          <div>
                            <Progress value={progress.percent} tone={progress.percent === 100 ? 'positive' : 'accent'} label={`${l.provider} repayment progress`} />
                            <p className="num mt-1.5 text-xs text-ink-faint">
                              {progress.paidCount}/{progress.totalCount} paid{progress.lastMonth ? ` · ends ${formatMonthKey(progress.lastMonth, { short: true })}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-faint">{l.kind === 'credit_card' ? 'Revolving balance' : 'No schedule'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <RowMenu items={actionsFor(l, inst.length > 0)} label={`Actions for ${l.provider}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line text-sm">
                  <td className="px-5 py-3 font-medium text-ink" colSpan={2}>Total · {rows.length}</td>
                  <td className="num px-3 py-3 text-right font-semibold text-ink">{formatINR(totals.owed)}</td>
                  <td className="num px-3 py-3 text-right font-medium text-ink-muted">{totals.emi ? formatINR(totals.emi) : '—'}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map(({ l, inst, owed, progress }) => {
                const m = memberMap.get(l.memberId);
                return (
                  <li key={l.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      {showMember && m && <MemberAvatar member={m} size="sm" />}
                      <button className="min-w-0 flex-1 text-left" onClick={() => openDialog({ type: 'liability', liability: l })}>
                        <p className="truncate font-medium text-ink">{l.provider}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {KIND_LABEL[l.kind]}
                          {l.cardLast4 && ` · •••• ${l.cardLast4}`}
                          {l.status !== 'active' && ` · ${STATUS_LABEL[l.status]}`}
                        </p>
                      </button>
                      <div className="text-right">
                        <p className="num font-semibold text-ink">{formatINR(owed)}</p>
                        {l.emiAmount && inst.length > 0 && <p className="num text-xs text-ink-faint">{formatINR(l.emiAmount)}/mo</p>}
                      </div>
                      <RowMenu items={actionsFor(l, inst.length > 0)} label={`Actions for ${l.provider}`} />
                    </div>
                    {progress && (
                      <div className="mt-3">
                        <Progress value={progress.percent} label={`${l.provider} repayment progress`} />
                        <p className="num mt-1 text-xs text-ink-faint">{progress.paidCount} of {progress.totalCount} EMIs paid</p>
                      </div>
                    )}
                  </li>
                );
              })}
              <li className="flex justify-between px-4 py-3 text-sm">
                <span className="font-medium text-ink">Total</span>
                <span className="num font-semibold text-ink">{formatINR(totals.owed)}</span>
              </li>
            </ul>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={`Delete ${toDelete?.provider ?? ''}?`}
        description="This removes it and its EMI schedule, including payments you’ve marked. If it’s been repaid, mark it as paid off instead to keep the history."
      />
    </div>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
