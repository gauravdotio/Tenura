import { useState, type FormEvent } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Expense, ExpenseCategory } from '../../lib/finance/types';
import { toISODate } from '../../lib/finance/dates';
import { newId } from '../../lib/finance/sample';
import { CATEGORY_LABEL, PAYMENT_METHODS } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { MemberSelect } from './MemberSelect';

export function ExpenseForm({ expense, onClose }: { expense?: Expense; onClose: () => void }) {
  const { saveExpense, scope, primary } = useFinance();
  const toast = useToast();
  const [memberId, setMemberId] = useState(expense?.memberId ?? (scope !== 'all' ? scope : primary?.id ?? ''));
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'groceries');
  const [date, setDate] = useState(expense?.date ?? toISODate(new Date()));
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? 'UPI');
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring ?? false);
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'What did you spend on?';
    if (!(Number(amount) > 0)) errs.amount = 'Enter an amount.';
    if (!date) errs.date = 'Pick a date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await saveExpense({
        id: expense?.id ?? newId(),
        memberId,
        title: title.trim(),
        amount: Number(amount),
        category,
        date,
        paymentMethod,
        isRecurring,
        notes: notes.trim() || undefined,
      });
      toast.success(expense ? 'Expense updated' : 'Expense added');
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="expense-form" loading={saving}>
            {expense ? 'Save changes' : 'Add expense'}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Description" error={errors.title} htmlFor="ef-title">
            <Input id="ef-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Electricity bill" />
          </Field>
          <Field label="Amount" error={errors.amount} htmlFor="ef-amount">
            <Input id="ef-amount" type="number" inputMode="decimal" min={0} prefix="₹" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="ef-cat">
            <Select id="ef-cat" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Date" error={errors.date} htmlFor="ef-date">
            <Input id="ef-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Paid with" htmlFor="ef-method">
            <Select id="ef-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Spent by" htmlFor="ef-member">
            <MemberSelect id="ef-member" value={memberId} onChange={setMemberId} />
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-line accent-[rgb(var(--accent))]" />
          This is a monthly recurring bill
        </label>
        <Field label="Notes" optional htmlFor="ef-notes">
          <Textarea id="ef-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
