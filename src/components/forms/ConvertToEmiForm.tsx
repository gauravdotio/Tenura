import { useState, type FormEvent } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Liability } from '../../lib/finance/types';
import { emiBreakdown } from '../../lib/finance/calc';
import { addMonthsToKey, formatMonthKey, toMonthKey } from '../../lib/finance/dates';
import { formatINR } from '../../lib/format';
import { Button, Field, Input, Modal, Segmented } from '../ui';

const TENURES = ['3', '6', '9', '12', '18', '24'] as const;

export function ConvertToEmiForm({ liability, onClose }: { liability: Liability; onClose: () => void }) {
  const { convertToEmi } = useFinance();
  const toast = useToast();
  const [tenure, setTenure] = useState<string>('9');
  const [rate, setRate] = useState('15');
  const [startMonth, setStartMonth] = useState(addMonthsToKey(toMonthKey(new Date()), 1));
  const [saving, setSaving] = useState(false);

  const n = Number(tenure);
  const r = Number(rate) || 0;
  const { emi, totalPayable, totalInterest } = emiBreakdown(liability.balance, r, n);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!(emi > 0)) return;
    setSaving(true);
    try {
      await convertToEmi(liability.id, { emiAmount: emi, tenureMonths: n, interestRate: r, startMonth });
      toast.success(`${liability.provider} converted to a ${n}-month EMI`);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Convert balance to EMI"
      description={`${liability.provider} · ${formatINR(liability.balance)} outstanding`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="convert-form" loading={saving} disabled={!(emi > 0)}>
            Create EMI plan
          </Button>
        </>
      }
    >
      <form id="convert-form" onSubmit={submit} className="grid gap-5">
        <Field label="Tenure">
          <Segmented value={tenure} onChange={setTenure} options={TENURES.map((t) => ({ value: t, label: `${t} mo` }))} className="w-full justify-between overflow-x-auto scrollbar-none" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interest rate" hint="Card EMIs are usually 13–18% p.a." htmlFor="cv-rate">
            <Input id="cv-rate" type="number" inputMode="decimal" min={0} step="0.01" suffix="% p.a." value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <Field label="First EMI month" htmlFor="cv-start">
            <Input id="cv-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value || startMonth)} />
          </Field>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            ['Monthly EMI', formatINR(emi)],
            ['Total payable', formatINR(totalPayable)],
            ['Interest cost', formatINR(totalInterest)],
            ['Last EMI', formatMonthKey(addMonthsToKey(startMonth, n - 1))],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface-sunken px-3.5 py-3">
              <dt className="text-xs text-ink-faint">{k}</dt>
              <dd className="num mt-0.5 text-sm font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </form>
    </Modal>
  );
}
