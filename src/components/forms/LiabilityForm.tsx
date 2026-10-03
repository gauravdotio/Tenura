import { useMemo, useState, type FormEvent } from 'react';
import { CreditCard, Landmark, ShoppingBag, Timer } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { CardNetwork, Liability, LiabilityKind } from '../../lib/finance/types';
import { emiBreakdown, hasPlan, utilizationTone } from '../../lib/finance/calc';
import { addMonthsToKey, formatMonthKey, toMonthKey } from '../../lib/finance/dates';
import { newId } from '../../lib/finance/sample';
import { NETWORK_LABEL, formatINR } from '../../lib/format';
import { Button, Field, Input, Modal, Progress, Select, Textarea, cx } from '../ui';
import { CreditCardVisual } from '../CreditCardVisual';
import { MemberSelect } from './MemberSelect';

const KINDS: { value: LiabilityKind; label: string; icon: typeof CreditCard }[] = [
  { value: 'credit_card', label: 'Credit card', icon: CreditCard },
  { value: 'loan', label: 'Loan', icon: Landmark },
  { value: 'emi', label: 'Consumer EMI', icon: ShoppingBag },
  { value: 'bnpl', label: 'Pay later', icon: Timer },
];

const PROVIDERS = [
  'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'SBI Card', 'Axis Bank', 'Kotak Mahindra Bank',
  'IDFC FIRST Bank', 'IndusInd Bank', 'RBL Bank', 'Yes Bank', 'AU Small Finance Bank', 'Bajaj Finserv',
  'Tata Capital', 'HDFC Credila', 'Amazon Pay Later', 'Simpl', 'LazyPay', 'Home Credit',
];

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

export function LiabilityForm({ liability, onClose }: { liability?: Liability; onClose: () => void }) {
  const { saveLiability, scope, primary, installmentsByLiability, memberMap } = useFinance();
  const toast = useToast();
  const editing = Boolean(liability);
  const isConverted = liability?.status === 'converted';

  const [memberId, setMemberId] = useState(liability?.memberId ?? (scope !== 'all' ? scope : primary?.id ?? ''));
  const [kind, setKind] = useState<LiabilityKind>(liability?.kind ?? 'credit_card');
  const [provider, setProvider] = useState(liability?.provider ?? '');
  const [balance, setBalance] = useState(liability?.balance ? String(liability.balance) : '');
  const [cardLast4, setCardLast4] = useState(liability?.cardLast4 ?? '');
  const [creditLimit, setCreditLimit] = useState(liability?.creditLimit ? String(liability.creditLimit) : '');
  const [network, setNetwork] = useState<CardNetwork | ''>(liability?.cardNetwork ?? '');
  const [dueDay, setDueDay] = useState(liability?.dueDay ? String(liability.dueDay) : '');
  const [rate, setRate] = useState(liability?.interestRate !== undefined ? String(liability.interestRate) : '');
  const [tenure, setTenure] = useState(liability?.tenureMonths ? String(liability.tenureMonths) : '');
  const [emiOverride, setEmiOverride] = useState(
    // An EMI that differs from the formula was typed in by hand — keep it
    liability?.emiAmount && hasPlan(liability) ? String(liability.emiAmount) : '',
  );
  const [startMonth, setStartMonth] = useState(liability?.startMonth ?? toMonthKey(new Date()));
  const [notes, setNotes] = useState(liability?.notes ?? '');
  const [closed, setClosed] = useState(liability?.status === 'closed');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const showsPlan = kind !== 'credit_card' || isConverted;
  const paidCount = liability ? (installmentsByLiability.get(liability.id) ?? []).filter((i) => i.paidOn).length : 0;

  const calc = useMemo(() => {
    const p = num(balance);
    const n = num(tenure);
    const r = num(rate);
    if (!(p > 0) || !(n > 0)) return null;
    const auto = emiBreakdown(p, Number.isFinite(r) ? r : 0, Math.round(n));
    const emi = num(emiOverride) > 0 ? Math.round(num(emiOverride)) : auto.emi;
    const total = emi * Math.round(n);
    return { autoEmi: auto.emi, emi, total, interest: Math.max(0, total - p), endMonth: addMonthsToKey(startMonth, Math.round(n) - 1) };
  }, [balance, tenure, rate, emiOverride, startMonth]);

  function validate() {
    const e: Record<string, string> = {};
    if (!memberId) e.member = 'Choose who this belongs to.';
    if (!provider.trim()) e.provider = 'Enter the bank or lender.';
    const b = num(balance);
    if (!(b >= 0) || (showsPlan && !(b > 0))) e.balance = showsPlan ? 'Enter the amount borrowed.' : 'Enter the current balance.';
    if (cardLast4 && !/^\d{4}$/.test(cardLast4)) e.cardLast4 = 'Four digits.';
    if (kind === 'credit_card' && creditLimit && !(num(creditLimit) > 0)) e.creditLimit = 'Enter your total credit limit.';
    if (dueDay && !(Number.isInteger(num(dueDay)) && num(dueDay) >= 1 && num(dueDay) <= 31)) e.dueDay = 'A day between 1 and 31.';
    if (showsPlan && tenure && !(Number.isInteger(num(tenure)) && num(tenure) >= 1 && num(tenure) <= 480)) e.tenure = '1 to 480 months.';
    if (rate && !(num(rate) >= 0 && num(rate) <= 60)) e.rate = '0% to 60%.';
    if (showsPlan && (kind === 'emi' || kind === 'bnpl' || isConverted) && !tenure) e.tenure = 'How many months?';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const planned = showsPlan && calc !== null;
    const next: Liability = {
      id: liability?.id ?? newId(),
      createdAt: liability?.createdAt ?? new Date().toISOString(),
      memberId,
      provider: provider.trim(),
      kind,
      status: closed ? 'closed' : isConverted ? 'converted' : 'active',
      balance: num(balance) || 0,
      cardLast4: kind === 'credit_card' && cardLast4 ? cardLast4 : undefined,
      creditLimit: kind === 'credit_card' && num(creditLimit) > 0 ? num(creditLimit) : undefined,
      cardNetwork: kind === 'credit_card' && network ? network : undefined,
      dueDay: dueDay ? num(dueDay) : undefined,
      interestRate: showsPlan && rate ? num(rate) : undefined,
      emiAmount: planned ? calc!.emi : undefined,
      tenureMonths: planned ? Math.round(num(tenure)) : undefined,
      startMonth: planned ? startMonth : undefined,
      notes: notes.trim() || undefined,
    };

    // Only rebuild the schedule when its shape changed — keeps paid months intact
    const planChanged =
      !liability ||
      liability.emiAmount !== next.emiAmount ||
      liability.tenureMonths !== next.tenureMonths ||
      liability.startMonth !== next.startMonth;
    const plan = !planned ? 'remove' : planChanged ? 'regenerate' : 'keep';

    setSaving(true);
    try {
      await saveLiability(next, plan);
      toast.success(editing ? 'Changes saved' : `${next.provider} added`);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${liability!.provider}` : 'Add a loan or card'}
      description={editing ? undefined : 'Track a credit card balance, a loan, or an EMI purchase.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="liability-form" loading={saving}>
            {editing ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="liability-form" onSubmit={submit} className="grid gap-5" noValidate>
        {!isConverted && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cx(
                  'flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-[13px] font-medium transition-colors',
                  kind === k.value ? 'border-ink bg-surface-sunken text-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                <k.icon className="h-4 w-4" aria-hidden />
                {k.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={kind === 'credit_card' ? 'Card issuer' : 'Lender'} error={errors.provider} htmlFor="lf-provider">
            <Input id="lf-provider" list="lf-providers" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={kind === 'emi' ? 'e.g. Bajaj Finserv — iPhone 16' : 'e.g. HDFC Bank'} autoComplete="off" />
            <datalist id="lf-providers">{PROVIDERS.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
          <Field label="Belongs to" error={errors.member} htmlFor="lf-member">
            <MemberSelect id="lf-member" value={memberId} onChange={setMemberId} />
          </Field>
        </div>

        {kind === 'credit_card' && (
          <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,15rem)_1fr]">
            <CreditCardVisual
              provider={provider.trim() || 'Your bank'}
              last4={cardLast4.length === 4 ? cardLast4 : undefined}
              network={network || undefined}
              holder={memberMap.get(memberId)?.name}
              size="sm"
              className="mx-auto w-full max-w-[15rem]"
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Last 4 digits" optional error={errors.cardLast4} htmlFor="lf-last4">
                  <Input id="lf-last4" inputMode="numeric" maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))} placeholder="4021" autoComplete="off" />
                </Field>
                <Field label="Network" optional htmlFor="lf-network">
                  <Select id="lf-network" value={network} onChange={(e) => setNetwork(e.target.value as CardNetwork | '')}>
                    <option value="">Not set</option>
                    {(Object.keys(NETWORK_LABEL) as CardNetwork[]).map((n) => <option key={n} value={n}>{NETWORK_LABEL[n]}</option>)}
                  </Select>
                </Field>
              </div>
              <p className="text-xs text-ink-faint">Never enter your full card number, expiry or CVV — Tenura doesn’t need them and never stores them.</p>
            </div>
          </div>
        )}

        {!showsPlan ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Outstanding balance" error={errors.balance} htmlFor="lf-balance">
              <Input id="lf-balance" type="number" inputMode="decimal" min={0} prefix="₹" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="25,000" />
            </Field>
            <Field label="Total credit limit" optional error={errors.creditLimit} htmlFor="lf-limit">
              <Input id="lf-limit" type="number" inputMode="decimal" min={0} prefix="₹" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="1,00,000" />
            </Field>
            <Field label="Bill due day" optional error={errors.dueDay} hint="We'll remind you each month." htmlFor="lf-due">
              <Input id="lf-due" type="number" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="18" />
            </Field>
            {num(creditLimit) > 0 && num(balance) >= 0 && <LimitMeter used={num(balance) || 0} limit={num(creditLimit)} />}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {isConverted && (
                <Field label="Total credit limit" optional error={errors.creditLimit} htmlFor="lf-limit2" className="sm:col-span-3">
                  <Input id="lf-limit2" type="number" inputMode="decimal" min={0} prefix="₹" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="1,00,000" />
                </Field>
              )}
              <Field label={isConverted ? 'Amount converted' : 'Amount borrowed'} error={errors.balance} htmlFor="lf-principal">
                <Input id="lf-principal" type="number" inputMode="decimal" min={0} prefix="₹" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="1,50,000" />
              </Field>
              <Field label="Interest rate" optional error={errors.rate} hint="Per year. Leave blank for no-cost EMI." htmlFor="lf-rate">
                <Input id="lf-rate" type="number" inputMode="decimal" min={0} step="0.01" suffix="% p.a." value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Tenure" optional={kind === 'loan'} error={errors.tenure} htmlFor="lf-tenure">
                <Input id="lf-tenure" type="number" inputMode="numeric" min={1} max={480} suffix="months" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="12" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Monthly EMI"
                htmlFor="lf-emi"
                hint={
                  emiOverride && calc && num(emiOverride) !== calc.autoEmi ? (
                    <button type="button" className="text-accent hover:underline" onClick={() => setEmiOverride('')}>
                      Use calculated {formatINR(calc.autoEmi)}
                    </button>
                  ) : (
                    'Calculated for you — edit to match your statement.'
                  )
                }
              >
                <Input id="lf-emi" type="number" inputMode="decimal" min={0} prefix="₹" value={emiOverride || (calc ? String(calc.autoEmi) : '')} onChange={(e) => setEmiOverride(e.target.value)} placeholder="—" />
              </Field>
              <Field label="First EMI month" htmlFor="lf-start">
                <Input id="lf-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value || toMonthKey(new Date()))} />
              </Field>
              <Field label="EMI debit day" optional error={errors.dueDay} hint="Defaults to the 5th." htmlFor="lf-due2">
                <Input id="lf-due2" type="number" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="5" />
              </Field>
            </div>

            {calc && (
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                {[
                  ['Monthly EMI', formatINR(calc.emi)],
                  ['Total payable', formatINR(calc.total)],
                  ['Interest', formatINR(calc.interest)],
                  ['Last EMI', formatMonthKey(calc.endMonth)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface-sunken px-3.5 py-3">
                    <dt className="text-xs text-ink-faint">{k}</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {editing && paidCount > 0 && (
              <p className="-mt-2 text-xs text-ink-faint">
                Changing the EMI, tenure or start month rebuilds the schedule. The {paidCount} instalment{paidCount === 1 ? '' : 's'} you've already marked paid stay paid.
              </p>
            )}
          </>
        )}

        <Field label="Notes" optional htmlFor="lf-notes">
          <Textarea id="lf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was this for?" rows={2} />
        </Field>

        {editing && (
          <Field label="Status" htmlFor="lf-status">
            <Select id="lf-status" value={closed ? 'closed' : 'open'} onChange={(e) => setClosed(e.target.value === 'closed')}>
              <option value="open">{isConverted ? 'Converted to EMI — repaying' : 'Active — still repaying'}</option>
              <option value="closed">Paid off</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}

function LimitMeter({ used, limit }: { used: number; limit: number }) {
  const pct = (used / limit) * 100;
  const tone = utilizationTone(pct);
  return (
    <div className="sm:col-span-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          Using <span className="num font-medium text-ink">{Math.round(pct)}%</span> of your limit · <span className="num">{formatINR(Math.max(0, limit - used))}</span> available
        </span>
        {pct > 100 && <span className="font-medium text-negative">Over limit</span>}
      </div>
      <Progress value={pct} tone={tone} className="mt-1.5" label="Credit limit used" />
      {tone !== 'positive' && pct <= 100 && <p className="mt-1.5 text-xs text-ink-faint">Keeping usage under 30% of the limit helps your CIBIL score.</p>}
    </div>
  );
}
