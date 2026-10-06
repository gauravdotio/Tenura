import { useMemo, useState } from 'react';
import { CalendarClock, CreditCard, Crown, Pencil, Receipt, ShieldCheck, Trash2, UserPlus, Users, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import type { Member } from '../lib/finance/types';
import { scopeData, summarize } from '../lib/finance/calc';
import { formatINR, pluralize } from '../lib/format';
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, PageHeader, Progress, Select } from '../components/ui';
import { navigate } from '../lib/router';
import { StatBand, StatCard } from '../components/Visuals';
import { MEMBER_HEX } from '../lib/visuals';
import { initials } from '../lib/format';
import { MemberLogin } from '../components/MemberLogin';

export function HouseholdPage() {
  const { data, summary, primary, setScope, removeMember } = useFinance();
  const openDialog = useOpenDialog();
  const toast = useToast();
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(
    () => new Map(data.members.map((m) => [m.id, { s: summarize(scopeData(data, m.id)), d: scopeData(data, m.id) }])),
    [data],
  );

  function askRemove(m: Member) {
    setToRemove(m);
    setReassignTo(primary?.id ?? '');
  }

  async function confirmRemove() {
    if (!toRemove || !reassignTo) return;
    setBusy(true);
    try {
      await removeMember(toRemove.id, reassignTo);
      toast.success(`${toRemove.name} removed`);
      setToRemove(null);
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  const removing = toRemove ? stats.get(toRemove.id)?.d : undefined;
  const removingCount = removing ? removing.liabilities.length + removing.expenses.length + removing.policies.length : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Household"
        description="Family members whose finances you manage. Everyone’s data stays inside your account."
        actions={<Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => openDialog({ type: 'member' })}>Add member</Button>}
      />

      <StatBand>
        <StatCard icon={<Users />} tint="accent" label="Members" value={String(data.members.length)} foot={data.members.map((m) => m.name.split(' ')[0]).join(', ')} />
        <StatCard icon={<Wallet />} tint="negative" label="Household outstanding" value={formatINR(summary.outstanding)} foot={`${summary.openCount} open loans & cards`} />
        <StatCard icon={<CalendarClock />} tint="warning" label="EMIs per month" value={formatINR(summary.monthlyEmi)} foot={`${summary.activePlanCount} active plans`} />
        <StatCard icon={<Receipt />} tint="positive" label="Spent this month" value={formatINR(summary.spentThisMonth)} foot={summary.monthlyBudget ? `of ${formatINR(summary.monthlyBudget)} combined budget` : 'No budgets set'} />
      </StatBand>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.members.map((m) => {
          const st = stats.get(m.id)!;
          const pct = m.monthlyBudget ? (st.s.spentThisMonth / m.monthlyBudget) * 100 : 0;
          return (
            <Card key={m.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative h-20" style={{ background: `linear-gradient(120deg, ${MEMBER_HEX[m.color] ?? MEMBER_HEX.slate} 0%, ${MEMBER_HEX[m.color] ?? MEMBER_HEX.slate}99 100%)` }}>
                <span className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/15" aria-hidden />
                <div className="absolute right-2 top-2 flex rounded-lg bg-white/90">
                  <IconButton label={`Edit ${m.name}`} onClick={() => openDialog({ type: 'member', member: m })}><Pencil className="h-4 w-4" /></IconButton>
                  {!m.isPrimary && (
                    <IconButton label={`Remove ${m.name}`} tone="danger" onClick={() => askRemove(m)}><Trash2 className="h-4 w-4" /></IconButton>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5">
              <span
                className="relative -mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl font-bold shadow-lg ring-4 ring-surface"
                style={{ color: MEMBER_HEX[m.color] ?? MEMBER_HEX.slate }}
                aria-hidden
              >
                {initials(m.name)}
              </span>
              <div className="mt-3 min-w-0">
                <h2 className="flex items-center gap-2 truncate text-[15px] font-semibold text-ink">
                  {m.name}
                  {m.isPrimary && <Badge tone="accent"><Crown className="h-3 w-3" /> You</Badge>}
                </h2>
                <p className="text-[13px] text-ink-muted">{m.isPrimary ? 'Account holder' : m.relation}</p>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <MiniFact icon={<Wallet className="h-3.5 w-3.5" />} label="Outstanding" value={formatINR(st.s.outstanding)} />
                <MiniFact icon={<CalendarClock className="h-3.5 w-3.5" />} label="EMIs / month" value={formatINR(st.s.monthlyEmi)} />
                <MiniFact icon={<CreditCard className="h-3.5 w-3.5" />} label="Loans & cards" value={`${st.s.openCount} open`} />
                <MiniFact icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Policies" value={String(st.d.policies.length)} />
              </dl>

              <div className="mt-5 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-faint">Spent this month</span>
                  <span className="num text-ink-muted">
                    {formatINR(st.s.spentThisMonth)}
                    {m.monthlyBudget > 0 && ` / ${formatINR(m.monthlyBudget)}`}
                  </span>
                </div>
                {m.monthlyBudget > 0 && <Progress className="mt-1.5" value={pct} tone={pct > 100 ? 'negative' : pct > 85 ? 'warning' : 'accent'} label={`${m.name} budget used`} />}
              </div>

              <MemberLogin member={m} />

              <Button
                size="sm"
                className="mt-5 self-start"
                onClick={() => {
                  setScope(m.id);
                  navigate('/app');
                }}
              >
                View {m.isPrimary ? 'your' : `${m.name}’s`} dashboard
              </Button>
              </div>
            </Card>
          );
        })}

        <button
          onClick={() => openDialog({ type: 'member' })}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-sm font-medium">Add a family member</span>
          <span className="max-w-[220px] text-center text-xs text-ink-faint">A parent, spouse or sibling whose bills you help manage</span>
        </button>
      </div>

      <ConfirmDialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        busy={busy}
        confirmLabel="Remove member"
        title={`Remove ${toRemove?.name ?? ''}?`}
        description={
          removingCount > 0 ? (
            <div className="space-y-4">
              <p>{toRemove?.name} has {pluralize(removingCount, 'record')} (loans, cards, expenses or policies). Choose who they should move to — nothing is deleted.</p>
              <Field label="Move records to" htmlFor="reassign">
                <Select id="reassign" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                  {data.members.filter((m) => m.id !== toRemove?.id).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <p>{toRemove?.name} has no records, so nothing else changes.</p>
          )
        }
      />
    </div>
  );
}

function MiniFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-ink-faint">{icon} {label}</dt>
      <dd className="num mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}
