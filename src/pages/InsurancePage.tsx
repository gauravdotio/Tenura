import { useMemo, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import type { Policy } from '../lib/finance/types';
import { annualPremium } from '../lib/finance/calc';
import { daysBetween, formatDate, formatRelativeDays, toISODate } from '../lib/finance/dates';
import { FREQUENCY_SUFFIX, formatINR, formatINRCompact } from '../lib/format';
import { StatTile } from '../components/StatTile';
import { Badge, Button, Card, ConfirmDialog, EmptyState, MemberAvatar, PageHeader } from '../components/ui';
import { RowMenu } from '../components/ui/Menu';

export function InsurancePage() {
  const { data, scoped, scope, memberMap, payPremium, removePolicy } = useFinance();
  const openDialog = useOpenDialog();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<Policy | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const today = toISODate(new Date());

  const policies = useMemo(
    () =>
      [...scoped.policies].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        return (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999');
      }),
    [scoped.policies],
  );
  const active = policies.filter((p) => p.status === 'active');
  const cover = active.reduce((s, p) => s + p.sumAssured, 0);
  const yearly = active.reduce((s, p) => s + annualPremium(p), 0);
  const nextDue = active.filter((p) => p.nextDueDate).sort((a, b) => a.nextDueDate!.localeCompare(b.nextDueDate!))[0];

  async function pay(p: Policy) {
    setBusy(p.id);
    try {
      await payPremium(p.id);
    } catch {
      /* toast shown */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Insurance & LIC"
        description="Premiums, cover and maturity dates for every policy in the family."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openDialog({ type: 'policy' })}>Add policy</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total cover" tone="positive" value={formatINRCompact(cover)} footer={`Sum assured across ${active.length} active ${active.length === 1 ? 'policy' : 'policies'}`} />
        <StatTile label="Premiums per year" tone="accent" value={formatINR(yearly)} footer={`≈ ${formatINR(Math.round(yearly / 12))} a month`} />
        <StatTile
          label="Next premium"
          value={nextDue ? formatINR(nextDue.premium) : '—'}
          footer={nextDue ? `${nextDue.name} · ${formatRelativeDays(daysBetween(today, nextDue.nextDueDate!)).toLowerCase()}` : 'Add a due date to get reminders'}
        />
      </div>

      {policies.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No policies yet"
            description="Add LIC, term, health or vehicle insurance to keep premiums and maturity dates in view."
            action={<Button variant="primary" onClick={() => openDialog({ type: 'policy' })}>Add policy</Button>}
          />
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {policies.map((p) => {
            const m = memberMap.get(p.memberId);
            const days = p.nextDueDate ? daysBetween(today, p.nextDueDate) : null;
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-faint">{p.provider}</p>
                    <h2 className="mt-0.5 truncate text-[15px] font-semibold text-ink">{p.name}</h2>
                    {p.policyNumber && <p className="mt-0.5 font-mono text-xs text-ink-faint">No. {p.policyNumber}</p>}
                  </div>
                  {p.status !== 'active' && <Badge tone={p.status === 'matured' ? 'positive' : 'negative'}>{p.status === 'matured' ? 'Matured' : 'Lapsed'}</Badge>}
                  <RowMenu
                    label={`Actions for ${p.name}`}
                    items={[
                      { label: 'Edit', icon: <Pencil />, onSelect: () => openDialog({ type: 'policy', policy: p }) },
                      { label: 'Delete', icon: <Trash2 />, tone: 'danger', onSelect: () => setToDelete(p) },
                    ]}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                    <dt className="text-xs text-ink-faint">Premium</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink">
                      {formatINR(p.premium)}<span className="font-normal text-ink-faint">{FREQUENCY_SUFFIX[p.frequency]}</span>
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                    <dt className="text-xs text-ink-faint">Sum assured</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink">{p.sumAssured ? formatINR(p.sumAssured) : '—'}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-1 flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1 text-xs text-ink-muted">
                    {p.nextDueDate && (
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-ink-faint" />
                        Next due {formatDate(p.nextDueDate)}
                        {p.status === 'active' && days !== null && days <= 30 && (
                          <Badge tone={days < 0 ? 'negative' : days <= 7 ? 'warning' : 'neutral'}>{formatRelativeDays(days)}</Badge>
                        )}
                      </p>
                    )}
                    {p.maturityDate && <p>Matures {formatDate(p.maturityDate)}</p>}
                    {scope === 'all' && data.members.length > 1 && m && (
                      <p className="flex items-center gap-1.5 pt-1"><MemberAvatar member={m} size="sm" /> {m.name}</p>
                    )}
                  </div>
                  {p.status === 'active' && p.nextDueDate && (
                    <Button size="sm" loading={busy === p.id} onClick={() => pay(p)} icon={<Check className="h-3.5 w-3.5" />}>
                      Premium paid
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await removePolicy(toDelete.id);
            toast.success('Policy deleted');
          } catch {
            /* toast shown */
          }
          setToDelete(null);
        }}
        title={`Delete ${toDelete?.name ?? 'policy'}?`}
        description="The policy and its premium reminders will be removed."
      />
    </div>
  );
}
