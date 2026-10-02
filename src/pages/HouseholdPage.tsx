import { useMemo, useState } from 'react';
import { Crown, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useOpenDialog } from '../context/DialogContext';
import { useToast } from '../context/ToastContext';
import type { Member } from '../lib/finance/types';
import { scopeData, summarize } from '../lib/finance/calc';
import { formatINR, pluralize } from '../lib/format';
import { Badge, Button, Card, ConfirmDialog, Field, IconButton, MemberAvatar, PageHeader, Progress, Select } from '../components/ui';
import { navigate } from '../lib/router';

export function HouseholdPage() {
  const { data, primary, setScope, removeMember } = useFinance();
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.members.map((m) => {
          const st = stats.get(m.id)!;
          const pct = m.monthlyBudget ? (st.s.spentThisMonth / m.monthlyBudget) * 100 : 0;
          return (
            <Card key={m.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <MemberAvatar member={m} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-2 truncate text-[15px] font-semibold text-ink">
                    {m.name}
                    {m.isPrimary && <Badge tone="accent"><Crown className="h-3 w-3" /> You</Badge>}
                  </h2>
                  <p className="text-[13px] text-ink-muted">{m.isPrimary ? 'Account holder' : m.relation}</p>
                </div>
                <div className="flex">
                  <IconButton label={`Edit ${m.name}`} onClick={() => openDialog({ type: 'member', member: m })}><Pencil className="h-4 w-4" /></IconButton>
                  {!m.isPrimary && (
                    <IconButton label={`Remove ${m.name}`} tone="danger" onClick={() => askRemove(m)}><Trash2 className="h-4 w-4" /></IconButton>
                  )}
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-faint">Outstanding</dt>
                  <dd className="num font-semibold text-ink">{formatINR(st.s.outstanding)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">EMIs / month</dt>
                  <dd className="num font-semibold text-ink">{formatINR(st.s.monthlyEmi)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Loans & cards</dt>
                  <dd className="text-ink">{st.s.openCount} open</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Policies</dt>
                  <dd className="text-ink">{st.d.policies.length}</dd>
                </div>
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
