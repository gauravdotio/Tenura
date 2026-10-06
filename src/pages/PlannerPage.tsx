import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Info,
  Lightbulb,
  Loader2,
  PartyPopper,
  Send,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { buildMoneyPlan, planSnapshot, simulatePayoff, CARD_APR, type Insight, type Severity, type Strategy } from '../lib/finance/advisor';
import { addMonthsToKey, formatMonthKey, toMonthKey } from '../lib/finance/dates';
import { formatINR, formatINRCompact } from '../lib/format';
import { href } from '../lib/router';
import { aiAvailable, explainPlan, type AiPlan } from '../lib/ai';
import { Glow, Ring } from '../components/Visuals';
import { CashFlowBar, Sparkline } from '../components/MoneyVisuals';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Progress, Segmented, cx } from '../components/ui';

const SEVERITY: Record<Severity, { icon: typeof Info; tone: string; ring: string; label: string }> = {
  urgent: { icon: AlertOctagon, tone: 'text-negative bg-negative-soft', ring: 'border-negative/30', label: 'Do this first' },
  high: { icon: AlertTriangle, tone: 'text-warning bg-warning-soft', ring: 'border-warning/30', label: 'Important' },
  medium: { icon: Info, tone: 'text-accent bg-accent-soft', ring: 'border-line', label: 'Worth doing' },
  tip: { icon: Lightbulb, tone: 'text-accent bg-accent-soft', ring: 'border-line', label: 'Opportunity' },
  good: { icon: CheckCircle2, tone: 'text-positive bg-positive-soft', ring: 'border-line', label: 'On track' },
};

const scoreColor = (s: number) => (s >= 80 ? 'rgb(var(--positive))' : s >= 65 ? 'var(--chart-1)' : s >= 45 ? 'rgb(var(--warning))' : 'rgb(var(--negative))');
const partTone = (s: number) => (s >= 75 ? 'positive' : s >= 45 ? 'warning' : 'negative') as 'positive' | 'warning' | 'negative';

/** Whether this user carries card balances — a planner preference, remembered on this device. */
function useCardsCarried(userId: string | undefined) {
  const key = `tenura:v4:cards-carried:${userId ?? ''}`;
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const set = (v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* private mode */
    }
  };
  return [value, set] as const;
}

export function PlannerPage() {
  const { user } = useAuth();
  const { scoped, scope, memberMap } = useFinance();
  const [cardsCarried, setCardsCarried] = useCardsCarried(user?.id);
  const plan = useMemo(() => buildMoneyPlan(scoped, new Date(), { cardsCarried }), [scoped, cardsCarried]);
  const hasCards = scoped.liabilities.some((l) => l.kind === 'credit_card' && l.status !== 'closed');
  const { cash, debts, health } = plan;
  const start = toMonthKey(new Date());
  const whose = scope === 'all' ? 'your household' : memberMap.get(scope)?.name ?? 'this member';

  const [extra, setExtra] = useState(plan.suggestedExtra);
  const [extraFor, setExtraFor] = useState(plan.suggestedExtra);
  if (extraFor !== plan.suggestedExtra) {
    // New data changed the suggestion: reset the slider to it
    setExtraFor(plan.suggestedExtra);
    setExtra(plan.suggestedExtra);
  }
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const current = useMemo(() => simulatePayoff(debts, 0, 'current', start), [debts, start]);
  const chosen = useMemo(() => simulatePayoff(debts, extra, strategy, start), [debts, extra, strategy, start]);
  const other = useMemo(() => simulatePayoff(debts, extra, strategy === 'avalanche' ? 'snowball' : 'avalanche', start), [debts, extra, strategy, start]);
  const saved = current.totalInterest - chosen.totalInterest;
  const sooner = current.stuck ? undefined : current.months - chosen.months;
  const sliderMax = Math.max(20000, Math.ceil((Math.max(0, cash.surplus) * 1.5) / 1000) * 1000);
  const assumed = debts.filter((d) => d.rateAssumed && !d.interestFree);

  const steps = plan.insights.filter((i) => i.severity !== 'good');
  const wins = plan.insights.filter((i) => i.severity === 'good');
  const checklist = [
    { done: cash.income > 0, label: 'Income', to: '/app/income' },
    { done: cash.spendingMonths > 0, label: 'Expenses', to: '/app/expenses' },
    { done: scoped.investments.length > 0, label: 'Investments', to: '/app/investments' },
    { done: scoped.policies.length > 0, label: 'Insurance', to: '/app/insurance' },
    { done: assumed.length === 0, label: 'Loan interest rates', to: '/app/liabilities' },
  ];
  const missing = checklist.filter((c) => !c.done);
  const biggest = steps.reduce<Insight | undefined>((best, i) => ((i.impact ?? 0) > (best?.impact ?? 0) ? i : best), undefined);
  const headline =
    steps.length === 0
      ? 'Nothing needs fixing right now. Keep it up.'
      : `${steps.length} step${steps.length === 1 ? '' : 's'} below would improve it${biggest?.impact ? ` — the biggest is worth about ${formatINRCompact(biggest.impact)} a year` : ''}.`;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Money plan"
        description={`Tenura reads ${whose}'s loans, cards, income, investments and policies, and works out the quickest, cheapest way to get debt-free.`}
      />

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm">
          <span className="mr-1 text-ink-muted">Make the plan sharper:</span>
          {checklist.map((c) => (
            <a
              key={c.label}
              href={href(c.to)}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-medium transition-colors',
                c.done ? 'border-transparent bg-positive-soft text-positive' : 'border-line text-ink hover:border-line-strong',
              )}
            >
              {c.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 text-ink-faint" />}
              {c.done ? c.label : `Add ${c.label.toLowerCase()}`}
            </a>
          ))}
        </div>
      )}

      {/* Health */}
      <Card className="relative overflow-hidden">
        <Glow />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Ring percent={health.score} size={136} stroke={10} color={scoreColor(health.score)} label={`Money health score ${health.score} out of 100`}>
                <span className="num text-4xl font-semibold tracking-tight text-ink">{health.score}</span>
                <span className="text-[11px] text-ink-faint">out of 100</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-muted">Money health</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: scoreColor(health.score) }}>{health.grade}</p>
                <p className="mt-2 text-sm text-ink-muted">{headline}</p>
              </div>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {health.parts.map((p) => (
                <li key={p.key} className="min-w-0">
                  <p className="text-xs font-medium text-ink">{p.label}</p>
                  <p className="truncate text-xs text-ink-muted">{p.value}</p>
                  <Progress value={p.score} tone={partTone(p.score)} className="mt-1.5" label={p.label} />
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-1 lg:border-l lg:border-t-0">
            <div className="p-6 sm:px-8">
              <dt className="text-[13px] font-medium text-ink-muted">Net worth</dt>
              <dd className={cx('num mt-1 text-2xl font-semibold tracking-tight', plan.netWorth >= 0 ? 'text-ink' : 'text-negative')}>
                {plan.netWorth < 0 && '−'}{formatINR(Math.abs(plan.netWorth))}
              </dd>
              <p className="mt-1 text-xs text-ink-faint">{formatINRCompact(plan.portfolio.value)} owned − {formatINRCompact(plan.totalPrincipal)} owed</p>
            </div>
            <div className="border-l border-line p-6 sm:px-8 lg:border-l-0 lg:border-t">
              <dt className="text-[13px] font-medium text-ink-muted">{cash.surplus < 0 ? 'Short each month' : 'Free each month'}</dt>
              <dd className={cx('num mt-1 text-2xl font-semibold tracking-tight', cash.surplus < 0 ? 'text-negative' : 'text-positive')}>{formatINR(Math.abs(cash.surplus))}</dd>
              <p className="mt-1 text-xs text-ink-faint">{cash.income > 0 ? 'After EMIs, premiums, investing and spending' : 'Add income to calculate'}</p>
            </div>
          </dl>
        </div>
      </Card>

      {cash.income > 0 && (
        <Card>
          <CardHeader title="Your month at a glance" description="Where take-home pay goes, on average." />
          <div className="px-5 pb-6 pt-5"><CashFlowBar cash={cash} /></div>
        </Card>
      )}

      {hasCards && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Card bills</p>
            <p className="text-xs text-ink-muted">Do you pay your credit card bills in full every month?</p>
          </div>
          <Segmented<'full' | 'carried'>
            size="sm"
            value={cardsCarried ? 'carried' : 'full'}
            onChange={(v) => setCardsCarried(v === 'carried')}
            options={[
              { value: 'full', label: 'Paid in full' },
              { value: 'carried', label: 'I carry a balance' },
            ]}
          />
        </div>
      )}

      {/* Steps */}
      <section aria-labelledby="steps-title">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="steps-title" className="text-lg font-semibold tracking-tight text-ink">Your action plan</h2>
          <span className="text-xs text-ink-faint">Most important first</span>
        </div>
        {steps.length === 0 ? (
          <Card className="flex items-center gap-3 p-5 text-sm text-ink-muted"><PartyPopper className="h-5 w-5 text-positive" /> No actions needed right now.</Card>
        ) : (
          <ol className="space-y-3">
            {steps.map((i, n) => <InsightCard key={i.id} insight={i} index={n + 1} />)}
          </ol>
        )}
        {wins.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {wins.map((i) => <InsightCard key={i.id} insight={i} compact />)}
          </ul>
        )}
      </section>

      {/* Payoff */}
      <Card>
        <CardHeader
          title="Become debt-free faster"
          description="Pay a little extra each month and roll every cleared EMI into the next debt."
        />
        {debts.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-ink-muted">
            <PartyPopper className="h-5 w-5 text-positive" />
            {plan.cardBills > 0 ? 'No loans or EMIs left — just keep paying card bills in full.' : "No open loans or card balances — you're debt-free."}
          </div>
        ) : (
          <div className="grid gap-6 p-5 pt-5 lg:grid-cols-[1fr_1.15fr]">
            <div className="space-y-5">
              <div>
                <label htmlFor="extra" className="flex items-baseline justify-between text-[13px] font-medium text-ink">
                  Extra each month
                  <span className="num text-lg font-semibold">{formatINR(extra)}</span>
                </label>
                <input
                  id="extra"
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={500}
                  value={Math.min(extra, sliderMax)}
                  onChange={(e) => setExtra(Number(e.target.value))}
                  className="mt-3 w-full accent-[rgb(var(--accent))]"
                />
                <p className="mt-1 text-xs text-ink-faint">
                  {cash.surplus > 0 ? `You have about ${formatINR(cash.surplus)} free each month. We suggest using half: ${formatINR(plan.suggestedExtra)}.` : 'Free up some money each month to speed this up.'}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">Which debt first?</p>
                <Segmented<Strategy>
                  value={strategy}
                  onChange={setStrategy}
                  options={[
                    { value: 'avalanche', label: 'Highest interest' },
                    { value: 'snowball', label: 'Smallest balance' },
                  ]}
                />
                <p className="mt-2 text-xs text-ink-muted">
                  {strategy === 'avalanche'
                    ? 'The “avalanche” saves the most interest.'
                    : 'The “snowball” clears small debts fast — motivating, but usually costs more interest.'}
                  {other.totalInterest !== chosen.totalInterest && (
                    <> The other method would {other.totalInterest < chosen.totalInterest ? 'save' : 'cost'} {formatINR(Math.abs(other.totalInterest - chosen.totalInterest))} more.</>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Result label="Debt-free" value={chosen.debtFreeMonth ? formatMonthKey(chosen.debtFreeMonth, { short: true }) : '—'} sub={current.debtFreeMonth ? `vs ${formatMonthKey(current.debtFreeMonth, { short: true })}` : current.stuck ? 'Never, at minimums' : undefined} />
                <Result label="Interest" value={formatINRCompact(chosen.totalInterest)} sub={`vs ${formatINRCompact(current.totalInterest)}`} />
                <Result
                  label="You save"
                  value={formatINRCompact(Math.max(0, saved))}
                  sub={sooner && sooner > 0 ? `${sooner} month${sooner === 1 ? '' : 's'} sooner` : current.stuck ? 'Minimums never clear it' : undefined}
                  positive
                />
              </div>
            </div>

            <div>
              <div className="rounded-2xl bg-surface-sunken p-4">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Debt left over time</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ink-faint" /> Today's path</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" /> Your plan</span>
                  </span>
                </div>
                <Sparkline
                  className="mt-3"
                  series={[
                    { values: current.balances.slice(0, 240), color: 'var(--chart-axis)', label: "Today's path", dashed: true },
                    { values: chosen.balances, color: 'rgb(var(--accent))', label: 'Your plan' },
                  ]}
                />
              </div>
              <ol className="mt-4 divide-y divide-line">
                {chosen.order.map((o, n) => {
                  const d = debts.find((x) => x.id === o.id)!;
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink">{n + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{o.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {formatINR(d.principal)} at {d.rate}%{d.rateAssumed && !d.interestFree ? ' (assumed)' : ''}
                        </span>
                      </span>
                      <span className="text-right text-xs text-ink-muted">
                        Cleared
                        <span className="block text-sm font-medium text-ink">{formatMonthKey(addMonthsToKey(start, o.month - 1), { short: true })}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {assumed.length > 0 && (
                <p className="mt-3 text-xs text-ink-faint">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-warning" />
                  {assumed.length} debt{assumed.length === 1 ? ' has' : 's have'} no interest rate yet, so we assumed one (cards {CARD_APR}%, loans 12%).{' '}
                  <a href={href('/app/liabilities')} className="text-accent hover:underline">Add the real rates</a> for an exact plan.
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {aiAvailable() && <AiExplainer snapshot={() => planSnapshot(plan, scoped)} />}

      <p className="text-xs text-ink-faint">
        Tenura's plan is general guidance worked out from the numbers you entered. It isn't investment advice — for decisions about specific funds or products, speak to a SEBI-registered investment adviser.
      </p>
    </div>
  );
}

function Result({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={cx('num mt-1 text-lg font-semibold tracking-tight', positive ? 'text-positive' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

function InsightCard({ insight: i, index, compact }: { insight: Insight; index?: number; compact?: boolean }) {
  const s = SEVERITY[i.severity];
  const Icon = s.icon;
  return (
    <li className={cx('flex gap-4 rounded-2xl border bg-surface p-4 shadow-card sm:p-5', s.ring, compact && 'p-4 sm:p-4')}>
      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', s.tone)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {index !== undefined && <span className="text-xs font-semibold text-ink-faint">Step {index}</span>}
          {!compact && <Badge tone={i.severity === 'urgent' ? 'negative' : i.severity === 'high' ? 'warning' : i.severity === 'good' ? 'positive' : 'accent'}>{s.label}</Badge>}
          {i.impact !== undefined && i.impact > 0 && <Badge tone="positive">≈ {formatINRCompact(i.impact)}/yr</Badge>}
        </div>
        <p className={cx('mt-1.5 font-semibold text-ink', compact ? 'text-sm' : 'text-[15px]')}>{i.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{i.detail}</p>
        {i.action && (
          <a href={href(i.action.to)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            {i.action.label} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}

const QUESTIONS = ['Should I prepay my loan or invest more?', 'How do I build my emergency fund?', 'Which loan should I close first and why?'];

function AiExplainer({ snapshot }: { snapshot: () => unknown }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AiPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const available = aiAvailable();

  async function run(e?: FormEvent, q = question) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await explainPlan(snapshot(), q));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-[#9085e9] to-positive" aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-[#9085e9] text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Ask Tenura AI</h2>
            <p className="mt-0.5 text-sm text-ink-muted">A plain-language plan, written for your numbers. Ask a follow-up if you like.</p>
          </div>
        </div>

        {!available ? (
          <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink-muted">The AI explainer needs cloud sync. The plan above works without it.</p>
        ) : (
          <>
            <form onSubmit={run} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 300))} placeholder="Optional: ask something specific…" aria-label="Your question" className="flex-1" />
              <Button type="submit" variant="primary" loading={busy} icon={<Send className="h-4 w-4" />}>
                {result ? 'Ask again' : 'Explain my plan'}
              </Button>
            </form>
            {!result && !busy && (
              <div className="mt-3 flex flex-wrap gap-2">
                {QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={() => { setQuestion(q); void run(undefined, q); }} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-ink-faint">Sends a summary of your numbers — amounts, rates and types, never names of people, card or account numbers — to Anthropic's Claude, which doesn't train on it.</p>
          </>
        )}

        {busy && (
          <div className="mt-5 flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" /> Reading your numbers…</div>
        )}
        {error && <p className="mt-5 rounded-xl bg-negative-soft px-4 py-3 text-sm text-negative">{error}</p>}

        {result && !busy && (
          <div className="mt-6 animate-fade-in space-y-5">
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">{result.headline}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{result.summary}</p>
            </div>
            {result.answer && (
              <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">{result.answer}</div>
            )}
            <ol className="space-y-3">
              {result.steps.map((s, n) => (
                <li key={n} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-ink-inverse">{n + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {s.title} <span className="ml-1 text-xs font-normal text-ink-faint">{s.timeframe}</span>
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            {result.watchOuts.length > 0 && (
              <div className="rounded-xl bg-warning-soft px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning"><TrendingDown className="h-4 w-4" /> Watch out for</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink">
                  {result.watchOuts.map((w, n) => <li key={n}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
