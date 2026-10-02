import { useState } from 'react';
import { CalendarCheck2, CreditCard, ShieldCheck, CalendarClock } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { DueItem } from '../lib/finance/calc';
import { formatDate, formatRelativeDays } from '../lib/finance/dates';
import { formatINR } from '../lib/format';
import { Badge, Button, EmptyState, MemberAvatar, cx } from './ui';

const ICON = { installment: CalendarClock, card: CreditCard, premium: ShieldCheck };

export function DueList({ items, showMember }: { items: DueItem[]; showMember: boolean }) {
  const { data, memberMap, setInstallmentPaid, markCardPaid, payPremium } = useFinance();
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CalendarCheck2 className="h-5 w-5" />}
        title="Nothing due in the next 30 days"
        description="EMIs, card bills with a due day, and insurance premiums show up here as they come due."
      />
    );
  }

  async function pay(item: DueItem) {
    setBusy(item.key);
    try {
      if (item.kind === 'installment') {
        const inst = data.installments.find((i) => i.id === item.installmentId);
        if (inst) await setInstallmentPaid(inst, true);
      } else if (item.kind === 'card') {
        await markCardPaid(item.liabilityId);
      } else {
        await payPremium(item.policyId);
      }
    } catch {
      /* toast already shown */
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const Icon = ICON[item.kind];
        const member = memberMap.get(item.memberId);
        const overdue = item.days < 0;
        const soon = item.days >= 0 && item.days <= 3;
        return (
          <li key={item.key} className="flex items-center gap-3 px-5 py-3.5">
            <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', overdue ? 'bg-negative-soft text-negative' : 'bg-surface-sunken text-ink-muted')}>
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                {showMember && member && <MemberAvatar member={member} size="sm" />}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                <span>{item.subtitle}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(item.date)}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="num text-sm font-semibold text-ink">{formatINR(item.amount)}</span>
              <Badge tone={overdue ? 'negative' : soon ? 'warning' : 'neutral'}>{formatRelativeDays(item.days)}</Badge>
            </div>
            <Button size="sm" variant="secondary" className="ml-1 hidden sm:inline-flex" loading={busy === item.key} onClick={() => pay(item)}>
              Mark paid
            </Button>
            <Button size="sm" variant="secondary" className="ml-1 px-2 sm:hidden" loading={busy === item.key} onClick={() => pay(item)} aria-label={`Mark ${item.title} paid`}>
              Paid
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
