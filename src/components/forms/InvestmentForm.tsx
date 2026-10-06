import { useState, type FormEvent } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import type { Investment, InvestmentKind, InvestmentStatus, PremiumFrequency } from '../../lib/finance/types';
import { newId } from '../../lib/finance/sample';
import { currentValue as estimateValue, investedSoFar, maturityValue } from '../../lib/finance/calc';
import { toISODate } from '../../lib/finance/dates';
import { FREQUENCY_LABEL, INVESTMENT_KIND_LABEL, INVESTMENT_STATUS_LABEL, formatINR } from '../../lib/format';
import { INVESTMENT_STYLE } from '../../lib/visuals';
import { Button, Field, Input, Modal, Select, Textarea, cx } from '../ui';
import { MemberSelect } from './MemberSelect';

/** Labels that fit the type buttons. */
const SHORT_LABEL: Partial<Record<InvestmentKind, string>> = { mutual_fund: 'Mutual fund', fd: 'FD', rd: 'RD', epf: 'EPF / PF', savings: 'Savings' };

/** Which fields each kind needs, and sensible defaults. */
const SHAPE: Record<InvestmentKind, {
  recurring?: boolean;
  rate?: boolean;
  maturity?: boolean;
  marketValue?: boolean;
  defaultRate?: number;
  providers: string[];
  namePlaceholder: string;
  investedLabel: string;
}> = {
  sip: { recurring: true, marketValue: true, providers: ['Parag Parikh MF', 'HDFC MF', 'SBI MF', 'ICICI Prudential MF', 'Axis MF', 'Nippon India MF', 'Groww', 'Zerodha Coin'], namePlaceholder: 'e.g. Flexi Cap Fund', investedLabel: 'Invested so far' },
  mutual_fund: { marketValue: true, providers: ['HDFC MF', 'SBI MF', 'ICICI Prudential MF', 'Axis MF', 'Kotak MF'], namePlaceholder: 'e.g. Nifty 50 Index Fund', investedLabel: 'Amount invested' },
  stocks: { marketValue: true, providers: ['Zerodha', 'Groww', 'Upstox', 'Angel One', 'ICICI Direct'], namePlaceholder: 'e.g. Long-term portfolio', investedLabel: 'Amount invested' },
  fd: { rate: true, maturity: true, defaultRate: 7, providers: ['SBI', 'HDFC Bank', 'ICICI Bank', 'Post Office', 'Bajaj Finance'], namePlaceholder: 'e.g. Tax-saver FD', investedLabel: 'Deposit amount' },
  rd: { recurring: true, rate: true, maturity: true, defaultRate: 6.7, providers: ['India Post', 'SBI', 'HDFC Bank', 'ICICI Bank'], namePlaceholder: 'e.g. 5-year RD', investedLabel: 'Deposited so far' },
  ppf: { recurring: true, rate: true, maturity: true, defaultRate: 7.1, providers: ['SBI', 'Post Office', 'HDFC Bank', 'ICICI Bank'], namePlaceholder: 'PPF account', investedLabel: 'Balance today' },
  epf: { recurring: true, rate: true, defaultRate: 8.25, providers: ['EPFO'], namePlaceholder: 'Provident Fund', investedLabel: 'Balance today' },
  nps: { recurring: true, marketValue: true, providers: ['NSDL', 'KFintech', 'SBI Pension Fund', 'HDFC Pension'], namePlaceholder: 'NPS Tier I', investedLabel: 'Contributed so far' },
  gold: { marketValue: true, providers: ['Tanishq', 'SGB (RBI)', 'Gold ETF', 'Digital gold'], namePlaceholder: 'e.g. Sovereign Gold Bond', investedLabel: 'Amount paid' },
  savings: { rate: true, defaultRate: 3, providers: ['SBI', 'HDFC Bank', 'ICICI Bank', 'Kotak', 'IDFC FIRST Bank'], namePlaceholder: 'Savings account', investedLabel: 'Balance' },
  other: { rate: true, marketValue: true, providers: [], namePlaceholder: 'Name', investedLabel: 'Amount invested' },
};

export function InvestmentForm({ investment, onClose }: { investment?: Investment; onClose: () => void }) {
  const { saveInvestment, scope, primary } = useFinance();
  const toast = useToast();
  const today = toISODate(new Date());
  const [kind, setKind] = useState<InvestmentKind>(investment?.kind ?? 'sip');
  const [memberId, setMemberId] = useState(investment?.memberId ?? (scope !== 'all' ? scope : primary?.id ?? ''));
  const [provider, setProvider] = useState(investment?.provider ?? '');
  const [name, setName] = useState(investment?.name ?? '');
  const [contribution, setContribution] = useState(investment?.contribution ? String(investment.contribution) : '');
  const [frequency, setFrequency] = useState<PremiumFrequency>(investment?.frequency ?? 'monthly');
  const [invested, setInvested] = useState(investment?.invested ? String(investment.invested) : '');
  const [current, setCurrent] = useState(investment?.currentValue ? String(investment.currentValue) : '');
  const [rate, setRate] = useState(investment?.interestRate !== undefined ? String(investment.interestRate) : '');
  const [startDate, setStartDate] = useState(investment?.startDate ?? '');
  const [maturityDate, setMaturityDate] = useState(investment?.maturityDate ?? '');
  const [emergencyFund, setEmergencyFund] = useState(investment?.emergencyFund ?? false);
  const [status, setStatus] = useState<InvestmentStatus>(investment?.status ?? 'active');
  const [notes, setNotes] = useState(investment?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const shape = SHAPE[kind];

  function pickKind(k: InvestmentKind) {
    setKind(k);
    if (!investment && SHAPE[k].defaultRate) setRate(String(SHAPE[k].defaultRate));
  }

  function build(): Investment {
    return {
      id: investment?.id ?? newId(),
      memberId,
      kind,
      provider: provider.trim(),
      name: name.trim() || shape.namePlaceholder.replace(/^e\.g\. /, ''),
      contribution: shape.recurring && Number(contribution) > 0 ? Number(contribution) : undefined,
      frequency: shape.recurring ? frequency : undefined,
      invested: Number(invested) || 0,
      currentValue: shape.marketValue && Number(current) > 0 ? Number(current) : undefined,
      interestRate: (shape.rate || kind === 'other') && rate !== '' ? Number(rate) : undefined,
      startDate: startDate || undefined,
      maturityDate: shape.maturity && maturityDate ? maturityDate : undefined,
      emergencyFund,
      status,
      notes: notes.trim() || undefined,
    };
  }

  // Live preview of what Tenura will show
  const draft = build();
  const estInvested = investedSoFar(draft, today);
  const estValue = estimateValue(draft, today);
  const atMaturity = maturityValue(draft, today);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (shape.recurring && !(Number(contribution) > 0) && !(Number(invested) > 0)) errs.contribution = 'Enter the instalment amount.';
    if (!shape.recurring && !(Number(invested) > 0)) errs.invested = 'Enter the amount.';
    if (shape.recurring && !(Number(invested) > 0) && !startDate) errs.start = 'Add a start date, or enter the amount invested so far.';
    if (rate !== '' && (Number(rate) < 0 || Number(rate) > 100)) errs.rate = 'Enter a rate between 0 and 100.';
    if (maturityDate && startDate && maturityDate <= startDate) errs.maturity = 'Maturity must be after the start date.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await saveInvestment(build());
      toast.success(investment ? 'Investment updated' : 'Investment added');
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={investment ? 'Edit investment' : 'Add investment'}
      description={investment ? undefined : 'SIPs, FDs, RDs, PPF and everything else your money is working in.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="investment-form" loading={saving}>
            {investment ? 'Save changes' : 'Add investment'}
          </Button>
        </>
      }
    >
      <form id="investment-form" onSubmit={submit} className="grid gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-ink">Type</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(Object.keys(INVESTMENT_KIND_LABEL) as InvestmentKind[]).map((k) => {
              const { icon: Icon, color } = INVESTMENT_STYLE[k];
              const on = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickKind(k)}
                  className={cx(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                    on ? 'border-ink bg-surface-sunken text-ink' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}1f`, color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{SHORT_LABEL[k] ?? INVESTMENT_KIND_LABEL[k]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="vf-name">
            <Input id="vf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={shape.namePlaceholder} />
          </Field>
          <Field label={kind === 'stocks' ? 'Broker' : kind === 'sip' || kind === 'mutual_fund' ? 'Fund house' : 'Bank or provider'} optional htmlFor="vf-provider">
            <Input id="vf-provider" list="vf-providers" value={provider} onChange={(e) => setProvider(e.target.value)} autoComplete="off" />
            <datalist id="vf-providers">{shape.providers.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>

          {shape.recurring && (
            <>
              <Field label={kind === 'sip' ? 'SIP amount' : 'Instalment'} error={errors.contribution} htmlFor="vf-contribution">
                <Input id="vf-contribution" type="number" inputMode="decimal" min={0} prefix="₹" value={contribution} onChange={(e) => setContribution(e.target.value)} />
              </Field>
              <Field label="Paid" htmlFor="vf-freq">
                <Select id="vf-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as PremiumFrequency)}>
                  {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
            </>
          )}

          <Field
            label={shape.investedLabel}
            optional={shape.recurring}
            error={errors.invested}
            hint={shape.recurring && !(Number(invested) > 0) && estInvested > 0 ? `Estimated from the start date: ${formatINR(estInvested)}` : undefined}
            htmlFor="vf-invested"
          >
            <Input id="vf-invested" type="number" inputMode="decimal" min={0} prefix="₹" value={invested} onChange={(e) => setInvested(e.target.value)} />
          </Field>

          {shape.marketValue && (
            <Field label="Current value" optional hint="From your app or statement. Leave blank to use the amount invested." htmlFor="vf-current">
              <Input id="vf-current" type="number" inputMode="decimal" min={0} prefix="₹" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
          )}

          {(shape.rate || kind === 'other') && (
            <Field label={kind === 'other' ? 'Expected return' : 'Interest rate'} optional={kind === 'savings' || kind === 'other'} error={errors.rate} htmlFor="vf-rate">
              <Input id="vf-rate" type="number" inputMode="decimal" min={0} max={100} step="0.05" suffix="% p.a." value={rate} onChange={(e) => setRate(e.target.value)} />
            </Field>
          )}

          {kind !== 'savings' && (
            <Field label="Start date" optional={!shape.recurring} error={errors.start} htmlFor="vf-start">
              <Input id="vf-start" type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
          )}

          {shape.maturity && (
            <Field label="Maturity date" optional error={errors.maturity} htmlFor="vf-maturity">
              <Input id="vf-maturity" type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </Field>
          )}

          <Field label="Belongs to" htmlFor="vf-member">
            <MemberSelect id="vf-member" value={memberId} onChange={setMemberId} />
          </Field>
          <Field label="Status" htmlFor="vf-status">
            <Select id="vf-status" value={status} onChange={(e) => setStatus(e.target.value as InvestmentStatus)}>
              {Object.entries(INVESTMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>

        {(estValue > 0 || atMaturity) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-surface-sunken px-4 py-3 text-sm">
            <span className="text-ink-muted">Worth today <span className="num font-semibold text-ink">{formatINR(estValue)}</span></span>
            {atMaturity !== undefined && <span className="text-ink-muted">At maturity <span className="num font-semibold text-positive">{formatINR(atMaturity)}</span></span>}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-3">
          <input type="checkbox" checked={emergencyFund} onChange={(e) => setEmergencyFund(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="block text-sm font-medium text-ink">This is my emergency fund</span>
            <span className="block text-xs text-ink-muted">Counted towards your safety net. The money planner never suggests using it to repay loans.</span>
          </span>
        </label>

        <Field label="Notes" optional htmlFor="vf-notes">
          <Textarea id="vf-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Folio number, nominee, goal…" />
        </Field>
      </form>
    </Modal>
  );
}
