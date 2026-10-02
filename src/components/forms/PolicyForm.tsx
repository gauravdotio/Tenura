import { useState, type FormEvent } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Policy, PolicyStatus, PremiumFrequency } from '../../lib/finance/types';
import { newId } from '../../lib/finance/sample';
import { FREQUENCY_LABEL } from '../../lib/format';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';
import { MemberSelect } from './MemberSelect';

const INSURERS = ['LIC of India', 'HDFC Life', 'ICICI Prudential', 'SBI Life', 'Max Life', 'Tata AIA', 'Bajaj Allianz', 'Star Health', 'Niva Bupa', 'Care Health'];

export function PolicyForm({ policy, onClose }: { policy?: Policy; onClose: () => void }) {
  const { savePolicy, scope, primary } = useFinance();
  const toast = useToast();
  const [memberId, setMemberId] = useState(policy?.memberId ?? (scope !== 'all' ? scope : primary?.id ?? ''));
  const [provider, setProvider] = useState(policy?.provider ?? 'LIC of India');
  const [name, setName] = useState(policy?.name ?? '');
  const [policyNumber, setPolicyNumber] = useState(policy?.policyNumber ?? '');
  const [premium, setPremium] = useState(policy ? String(policy.premium) : '');
  const [frequency, setFrequency] = useState<PremiumFrequency>(policy?.frequency ?? 'yearly');
  const [sumAssured, setSumAssured] = useState(policy?.sumAssured ? String(policy.sumAssured) : '');
  const [nextDueDate, setNextDueDate] = useState(policy?.nextDueDate ?? '');
  const [maturityDate, setMaturityDate] = useState(policy?.maturityDate ?? '');
  const [status, setStatus] = useState<PolicyStatus>(policy?.status ?? 'active');
  const [notes, setNotes] = useState(policy?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!provider.trim()) errs.provider = 'Who is the insurer?';
    if (!name.trim()) errs.name = 'Give the plan a name.';
    if (!(Number(premium) > 0)) errs.premium = 'Enter the premium.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await savePolicy({
        id: policy?.id ?? newId(),
        memberId,
        provider: provider.trim(),
        name: name.trim(),
        policyNumber: policyNumber.trim() || undefined,
        premium: Number(premium),
        frequency,
        sumAssured: Number(sumAssured) || 0,
        nextDueDate: nextDueDate || undefined,
        maturityDate: maturityDate || undefined,
        status,
        notes: notes.trim() || undefined,
      });
      toast.success(policy ? 'Policy updated' : 'Policy added');
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={policy ? 'Edit policy' : 'Add insurance policy'}
      description={policy ? undefined : 'LIC, term, health or any other plan with a premium to remember.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="policy-form" loading={saving}>
            {policy ? 'Save changes' : 'Add policy'}
          </Button>
        </>
      }
    >
      <form id="policy-form" onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Insurer" error={errors.provider} htmlFor="pf-provider">
            <Input id="pf-provider" list="pf-insurers" value={provider} onChange={(e) => setProvider(e.target.value)} autoComplete="off" />
            <datalist id="pf-insurers">{INSURERS.map((i) => <option key={i} value={i} />)}</datalist>
          </Field>
          <Field label="Plan name" error={errors.name} htmlFor="pf-name">
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jeevan Labh (936)" />
          </Field>
          <Field label="Premium" error={errors.premium} htmlFor="pf-premium">
            <Input id="pf-premium" type="number" inputMode="decimal" min={0} prefix="₹" value={premium} onChange={(e) => setPremium(e.target.value)} />
          </Field>
          <Field label="Paid" htmlFor="pf-freq">
            <Select id="pf-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as PremiumFrequency)}>
              {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Next premium due" optional hint="Shows up in your reminders." htmlFor="pf-next">
            <Input id="pf-next" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </Field>
          <Field label="Sum assured" optional htmlFor="pf-sum">
            <Input id="pf-sum" type="number" inputMode="decimal" min={0} prefix="₹" value={sumAssured} onChange={(e) => setSumAssured(e.target.value)} />
          </Field>
          <Field label="Maturity date" optional htmlFor="pf-maturity">
            <Input id="pf-maturity" type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
          </Field>
          <Field label="Policy number" optional htmlFor="pf-number">
            <Input id="pf-number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </Field>
          <Field label="Insured member" htmlFor="pf-member">
            <MemberSelect id="pf-member" value={memberId} onChange={setMemberId} />
          </Field>
          <Field label="Status" htmlFor="pf-status">
            <Select id="pf-status" value={status} onChange={(e) => setStatus(e.target.value as PolicyStatus)}>
              <option value="active">Active</option>
              <option value="lapsed">Lapsed</option>
              <option value="matured">Matured</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes" optional htmlFor="pf-notes">
          <Textarea id="pf-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Riders, nominee, tax section…" />
        </Field>
      </form>
    </Modal>
  );
}
