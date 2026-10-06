import { useState, type FormEvent } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Income, IncomeKind, PremiumFrequency } from '../../lib/finance/types';
import { newId } from '../../lib/finance/sample';
import { FREQUENCY_LABEL, INCOME_KIND_LABEL, formatINR } from '../../lib/format';
import { INCOME_STYLE } from '../../lib/visuals';
import { Button, Field, Input, Modal, Select, Textarea, cx } from '../ui';
import { MemberSelect } from './MemberSelect';

const SOURCE_HINT: Record<IncomeKind, string> = {
  salary: 'Employer, e.g. Infosys',
  business: 'e.g. Sharma Traders',
  freelance: 'Client or platform',
  rental: 'e.g. Flat 2B rent',
  pension: 'e.g. Family pension',
  interest: 'e.g. FD interest, dividends',
  other: 'Where it comes from',
};

export function IncomeForm({ income, onClose }: { income?: Income; onClose: () => void }) {
  const { saveIncome, scope, primary } = useFinance();
  const toast = useToast();
  const [memberId, setMemberId] = useState(income?.memberId ?? (scope !== 'all' ? scope : primary?.id ?? ''));
  const [kind, setKind] = useState<IncomeKind>(income?.kind ?? 'salary');
  const [source, setSource] = useState(income?.source ?? '');
  const [amount, setAmount] = useState(income ? String(income.amount) : '');
  const [frequency, setFrequency] = useState<PremiumFrequency>(income?.frequency ?? 'monthly');
  const [isActive, setIsActive] = useState(income?.isActive ?? true);
  const [notes, setNotes] = useState(income?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const perMonth = frequency === 'monthly' ? undefined : (Number(amount) * { monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1 }[frequency]) / 12;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!source.trim()) errs.source = 'Where does this money come from?';
    if (!(Number(amount) > 0)) errs.amount = 'Enter the amount you receive.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await saveIncome({
        id: income?.id ?? newId(),
        memberId,
        kind,
        source: source.trim(),
        amount: Number(amount),
        frequency,
        isActive,
        notes: notes.trim() || undefined,
      });
      toast.success(income ? 'Income updated' : 'Income added');
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={income ? 'Edit income' : 'Add income'}
      description={income ? undefined : 'Salary, business, rent or pension — the amount that actually reaches the bank.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="income-form" loading={saving}>
            {income ? 'Save changes' : 'Add income'}
          </Button>
        </>
      }
    >
      <form id="income-form" onSubmit={submit} className="grid gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink">Type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(INCOME_KIND_LABEL) as IncomeKind[]).map((k) => {
              const { icon: Icon, color } = INCOME_STYLE[k];
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setKind(k)}
                  className={cx(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                    on ? 'border-ink bg-surface-sunken text-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}1f`, color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{INCOME_KIND_LABEL[k]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" error={errors.source} htmlFor="if-source">
            <Input id="if-source" value={source} onChange={(e) => setSource(e.target.value)} placeholder={SOURCE_HINT[kind]} />
          </Field>
          <Field label="Earned by" htmlFor="if-member">
            <MemberSelect id="if-member" value={memberId} onChange={setMemberId} />
          </Field>
          <Field
            label="Take-home amount"
            error={errors.amount}
            hint={perMonth ? `≈ ${formatINR(perMonth)} a month` : 'After tax and deductions — what you actually receive.'}
            htmlFor="if-amount"
          >
            <Input id="if-amount" type="number" inputMode="decimal" min={0} prefix="₹" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Received" htmlFor="if-freq">
            <Select id="if-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as PremiumFrequency)}>
              {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-3">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="block text-sm font-medium text-ink">Currently receiving this</span>
            <span className="block text-xs text-ink-muted">Untick for a job you've left or rent that has stopped — it stays in your history.</span>
          </span>
        </label>

        <Field label="Notes" optional htmlFor="if-notes">
          <Textarea id="if-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bonus month, increment date…" />
        </Field>
      </form>
    </Modal>
  );
}
