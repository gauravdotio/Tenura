import { CalendarClock, Pencil, Plus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import type { Liability } from '../lib/finance/types';
import { cardUsage, utilizationTone } from '../lib/finance/calc';
import { formatINR } from '../lib/format';
import { CreditCardVisual } from './CreditCardVisual';
import { Badge, IconButton, Progress, cx } from './ui';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** One card with its usage underneath. */
export function CardTile({ card, compact }: { card: Liability; compact?: boolean }) {
  const { installmentsByLiability, memberMap } = useFinance();
  const openDialog = useOpenDialog();
  const usage = cardUsage(card, installmentsByLiability.get(card.id) ?? []);
  const tone = usage.percent !== undefined ? utilizationTone(usage.percent) : undefined;

  return (
    <div className="group flex flex-col">
      <CreditCardVisual
        provider={card.provider}
        last4={card.cardLast4}
        network={card.cardNetwork}
        holder={memberMap.get(card.memberId)?.name}
        size={compact ? 'sm' : 'md'}
      />
      <div className={cx('mt-3 flex-1', compact ? 'px-0.5' : 'px-1')}>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-sm text-ink-muted">
            <span className="font-semibold text-ink">{formatINR(usage.used)}</span>
            {usage.limit !== undefined && <> of {formatINR(usage.limit)}</>}
          </p>
          <div className="flex items-center gap-1">
            {card.status === 'converted' && <Badge tone="accent">On EMI</Badge>}
            {!compact && (
              <IconButton label={`Edit ${card.provider}`} onClick={() => openDialog({ type: 'liability', liability: card })}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        </div>
        {usage.percent !== undefined ? (
          <>
            <Progress value={usage.percent} tone={tone} className="mt-2" label={`${card.provider} limit used`} />
            <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
              <span className={cx(tone === 'negative' && 'text-negative', tone === 'warning' && 'text-warning')}>
                {Math.round(usage.percent)}% used
              </span>
              <span className="num">{formatINR(usage.available ?? 0)} available</span>
            </div>
          </>
        ) : (
          <button onClick={() => openDialog({ type: 'liability', liability: card })} className="mt-1 text-xs font-medium text-accent hover:underline">
            Add credit limit to see usage
          </button>
        )}
        {!compact && card.dueDay && card.status === 'active' && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5 text-ink-faint" /> Bill due on the {ordinal(card.dueDay)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Grid of the household's open credit cards, plus an "add card" tile. */
export function CardsGallery({ cards }: { cards: Liability[] }) {
  const openDialog = useOpenDialog();
  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <CardTile key={c.id} card={c} />
      ))}
      <button
        onClick={() => openDialog({ type: 'liability' })}
        className="flex aspect-[1.586] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-medium">Add a credit card</span>
      </button>
    </div>
  );
}
