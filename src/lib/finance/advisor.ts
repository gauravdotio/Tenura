import type { FinanceData, Installment, Investment, Liability, Policy } from './types';
import {
  annualPremium,
  creditTotals,
  currentValue,
  groupInstallments,
  investedSoFar,
  monthlyContribution,
  outstandingFor,
  planProgress,
  portfolioSummary,
  summarize,
  totalMonthlyIncome,
} from './calc';
import { addMonthsToKey, daysBetween, toISODate, toMonthKey } from './dates';

/**
 * Tenura's money planner. Everything here is plain arithmetic on the user's
 * own numbers — the AI layer only explains these results, it never does maths.
 */

// ---------------------------------------------------------------------------
// Assumptions (India). Shown to the user wherever they affect a result.
// ---------------------------------------------------------------------------

/** Typical Indian card finance charge: ~3.5% a month. */
export const CARD_APR = 42;
/** Rate assumed for a loan whose rate wasn't entered. */
export const UNKNOWN_LOAN_RATE = 12;
/** Card minimum due: 5% of the balance, at least ₹200. */
const MIN_DUE_PCT = 0.05;
const MIN_DUE_FLOOR = 200;
/** A debt is "expensive" above this rate — worth clearing before investing. */
export const EXPENSIVE_RATE = 14;
/** Life cover rule of thumb: 10× yearly income. */
const COVER_MULTIPLE = 10;
/** Kinds that can be withdrawn quickly without market risk. */
const LIQUID_KINDS = new Set<Investment['kind']>(['fd', 'savings', 'rd']);
/** Recurring investments it's reasonable to pause while clearing costly debt. */
const PAUSABLE = new Set<Investment['kind']>(['sip', 'rd', 'mutual_fund', 'other']);

// ---------------------------------------------------------------------------
// Debts in a form the simulator understands
// ---------------------------------------------------------------------------

export interface Debt {
  id: string;
  name: string;
  memberId: string;
  kind: Liability['kind'];
  /** Principal still owed (EMI plans: present value of the remaining EMIs). */
  principal: number;
  /** What is still owed including interest built into an EMI plan. */
  outstanding: number;
  /** Annual rate, percent. */
  rate: number;
  rateAssumed: boolean;
  /** Payment the lender expects each month. */
  payment: number;
  /** A card balance that revolves (not converted to EMI). */
  revolving: boolean;
  /** 0% plans (no-cost EMI, pay-later). */
  interestFree: boolean;
  monthsLeft?: number;
}

/** Present value of `n` monthly payments at an annual rate — the principal behind the remaining EMIs. */
function principalLeft(emi: number, ratePct: number, n: number) {
  if (n <= 0) return 0;
  const r = ratePct / 1200;
  if (r === 0) return emi * n;
  return (emi * (1 - Math.pow(1 + r, -n))) / r;
}

function rateFor(l: Liability): { rate: number; assumed: boolean } {
  if (l.interestRate !== undefined && l.interestRate !== null) return { rate: l.interestRate, assumed: false };
  if (l.kind === 'credit_card' && l.status === 'active') return { rate: CARD_APR, assumed: true };
  if (l.kind === 'bnpl') return { rate: 0, assumed: true };
  return { rate: UNKNOWN_LOAN_RATE, assumed: true };
}

/**
 * Open debts. A card balance without an EMI plan is usually just this month's
 * bill: unless `cardsCarried`, it's treated as paid in full by the due date
 * (see `cardBills`) rather than as debt revolving at ~42%.
 */
export function debtsFrom(data: FinanceData, cardsCarried = false): Debt[] {
  const byLiability = groupInstallments(data.installments);
  const debts: Debt[] = [];
  for (const l of data.liabilities) {
    if (l.status === 'closed') continue;
    const inst: Installment[] = byLiability.get(l.id) ?? [];
    const outstanding = outstandingFor(l, inst);
    if (outstanding <= 0) continue;
    const { rate, assumed } = rateFor(l);
    const name = l.cardLast4 ? `${l.provider} ··${l.cardLast4}` : l.provider;

    if (inst.length > 0) {
      const p = planProgress(inst);
      const n = p.totalCount - p.paidCount;
      const emi = p.nextDue?.amount ?? l.emiAmount ?? 0;
      debts.push({
        id: l.id, name, memberId: l.memberId, kind: l.kind,
        principal: Math.round(principalLeft(emi, rate, n)),
        outstanding, rate, rateAssumed: assumed, payment: emi,
        revolving: false, interestFree: rate === 0, monthsLeft: n,
      });
    } else {
      const revolving = l.kind === 'credit_card';
      if (revolving && !cardsCarried) continue;
      const payment = revolving ? Math.min(outstanding, Math.max(MIN_DUE_FLOOR, outstanding * MIN_DUE_PCT)) : l.emiAmount ?? Math.max(MIN_DUE_FLOOR, outstanding * 0.03);
      debts.push({
        id: l.id, name, memberId: l.memberId, kind: l.kind,
        principal: outstanding, outstanding, rate, rateAssumed: assumed,
        payment: Math.round(payment), revolving, interestFree: rate === 0,
      });
    }
  }
  return debts;
}

/** Card bills (balances without an EMI plan) — what is due on cards this cycle. */
export function cardBills(data: FinanceData): number {
  const byLiability = groupInstallments(data.installments);
  return data.liabilities
    .filter((l) => l.kind === 'credit_card' && l.status === 'active' && !(byLiability.get(l.id)?.length))
    .reduce((s, l) => s + Math.max(0, l.balance), 0);
}

// ---------------------------------------------------------------------------
// Payoff simulation
// ---------------------------------------------------------------------------

export type Strategy = 'avalanche' | 'snowball';

export interface PayoffResult {
  strategy: Strategy | 'current';
  months: number;
  /** YYYY-MM of the last payment. */
  debtFreeMonth?: string;
  totalInterest: number;
  totalPaid: number;
  /** Debts in the order they are cleared. */
  order: { id: string; name: string; month: number }[];
  /** Balance left at the end of each month (index 0 = today). */
  balances: number[];
  /** Did not finish within the horizon — payments don't cover interest. */
  stuck: boolean;
}

const HORIZON = 600;

/**
 * Month-by-month payoff. Every debt gets its required payment; `extra` (plus,
 * for a strategy, payments freed up by debts already cleared) goes to one
 * target at a time. `current` = required payments only, nothing rolled over.
 */
export function simulatePayoff(debts: Debt[], extra: number, strategy: Strategy | 'current', startMonth: string): PayoffResult {
  const live = debts.map((d) => ({ ...d, balance: d.principal }));
  const order: PayoffResult['order'] = [];
  const balances = [Math.round(live.reduce((s, d) => s + d.balance, 0))];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const budget = live.reduce((s, d) => s + d.payment, 0) + Math.max(0, extra);

  const pick = () => {
    const open = live.filter((d) => d.balance > 0.5);
    if (strategy === 'avalanche') return open.sort((a, b) => b.rate - a.rate || a.balance - b.balance)[0];
    if (strategy === 'snowball') return open.sort((a, b) => a.balance - b.balance || b.rate - a.rate)[0];
    return undefined;
  };

  while (live.some((d) => d.balance > 0.5) && month < HORIZON) {
    month++;
    let spent = 0;
    for (const d of live) {
      if (d.balance <= 0.5) continue;
      const interest = (d.balance * d.rate) / 1200;
      totalInterest += interest;
      d.balance += interest;
      // A revolving card's minimum shrinks with the balance
      const due = d.revolving ? Math.max(MIN_DUE_FLOOR, d.balance * MIN_DUE_PCT) : d.payment;
      const pay = Math.min(d.balance, due);
      d.balance -= pay;
      spent += pay;
    }
    if (strategy !== 'current') {
      let pool = Math.max(0, budget - spent);
      while (pool > 0.5) {
        const target = pick();
        if (!target) break;
        const pay = Math.min(pool, target.balance);
        target.balance -= pay;
        pool -= pay;
        spent += pay;
      }
    }
    totalPaid += spent;
    for (const d of live) {
      if (d.balance <= 0.5 && !order.some((o) => o.id === d.id)) {
        d.balance = 0;
        order.push({ id: d.id, name: d.name, month });
      }
    }
    balances.push(Math.round(live.reduce((s, d) => s + d.balance, 0)));
  }

  const stuck = live.some((d) => d.balance > 0.5);
  return {
    strategy,
    months: month,
    debtFreeMonth: stuck || month === 0 ? undefined : addMonthsToKey(startMonth, month - 1),
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    order,
    balances,
    stuck,
  };
}

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export type Severity = 'urgent' | 'high' | 'medium' | 'tip' | 'good';

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** Money saved or at stake per year, when it can be estimated. */
  impact?: number;
  action?: { label: string; to: string };
}

export interface HealthPart {
  key: 'debt' | 'savings' | 'emergency' | 'expensive' | 'credit' | 'cover';
  label: string;
  score: number;
  weight: number;
  value: string;
}

export interface CashFlow {
  income: number;
  emis: number;
  premiums: number;
  investing: number;
  spending: number;
  /** Months of expense history the spending figure is based on. */
  spendingMonths: number;
  surplus: number;
}

export interface PlanOptions {
  /** The user carries card balances from month to month instead of paying in full. */
  cardsCarried?: boolean;
}

export interface MoneyPlan {
  today: string;
  cash: CashFlow;
  /** Loans, EMIs and pay-later — plus card balances when they're carried over. */
  debts: Debt[];
  cardsCarried: boolean;
  /** Card bills assumed paid in full (0 when `cardsCarried`). */
  cardBills: number;
  /** Everything owed: debts plus card bills. */
  totalPrincipal: number;
  expensiveDebt: number;
  emiToIncome?: number;
  savingsRate?: number;
  /** Savings accounts plus anything marked as the emergency fund. */
  emergencyPot: number;
  emergencyMonths?: number;
  creditUtilisation?: number;
  lifeCover: number;
  hasHealthCover: boolean;
  portfolio: ReturnType<typeof portfolioSummary>;
  netWorth: number;
  health: { score: number; grade: string; parts: HealthPart[] };
  /** Extra monthly amount the comparison uses by default. */
  suggestedExtra: number;
  insights: Insight[];
}

const HEALTH = /health|medi|optima|care\b|star health|niva|bupa|arogya|family floater/i;
const TERM = /term|protect|iprotect|saral jeevan|e-?shield|smart shield/i;

export function isHealthPolicy(p: Policy) {
  return HEALTH.test(`${p.name} ${p.provider} ${p.notes ?? ''}`);
}
export function isTermPolicy(p: Policy) {
  return !isHealthPolicy(p) && TERM.test(`${p.name} ${p.notes ?? ''}`);
}

/** Average monthly spend over the last three months that have expenses. */
function averageSpending(data: FinanceData, today: Date) {
  const thisMonth = toMonthKey(today);
  const months = [0, 1, 2, 3].map((k) => addMonthsToKey(thisMonth, -k));
  const totals = months.map((m) => data.expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0));
  // Prefer complete months; use this month only when it's all there is
  const complete = totals.slice(1).filter((t) => t > 0);
  if (complete.length) return { amount: complete.reduce((a, b) => a + b, 0) / complete.length, months: complete.length };
  return { amount: totals[0], months: totals[0] > 0 ? 1 : 0 };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
/** Piecewise-linear score through (x, score) points, x ascending. */
function curve(x: number, points: [number, number][]) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const money = (n: number) => inr.format(Math.round(n));
const pct = (n: number) => `${Math.round(n)}%`;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function buildMoneyPlan(data: FinanceData, now: Date = new Date(), options: PlanOptions = {}): MoneyPlan {
  const cardsCarried = options.cardsCarried ?? false;
  const today = toISODate(now);
  const summary = summarize(data, now);
  const income = totalMonthlyIncome(data.incomes);
  const portfolio = portfolioSummary(data.investments, today);
  const spend = averageSpending(data, now);
  const investing = portfolio.monthlyContributions;
  const cash: CashFlow = {
    income,
    emis: summary.monthlyEmi,
    premiums: summary.monthlyPremiums,
    investing,
    spending: Math.round(spend.amount),
    spendingMonths: spend.months,
    surplus: Math.round(income - summary.monthlyEmi - summary.monthlyPremiums - investing - spend.amount),
  };

  const debts = debtsFrom(data, cardsCarried);
  const bills = cardsCarried ? 0 : cardBills(data);
  const totalPrincipal = debts.reduce((s, d) => s + d.principal, 0) + bills;
  const expensive = debts.filter((d) => d.rate >= EXPENSIVE_RATE);
  const expensiveDebt = expensive.reduce((s, d) => s + d.principal, 0);
  const credit = creditTotals(data);

  const essentials = cash.spending + cash.emis + cash.premiums;
  const emergencyPot = data.investments
    .filter((i) => i.status !== 'closed' && (i.emergencyFund || i.kind === 'savings'))
    .reduce((s, i) => s + currentValue(i, today), 0);
  const emergencyMonths = essentials > 0 ? emergencyPot / essentials : undefined;

  const activePolicies = data.policies.filter((p) => p.status === 'active');
  const lifeCover = activePolicies.filter((p) => !isHealthPolicy(p)).reduce((s, p) => s + p.sumAssured, 0);
  const hasHealthCover = activePolicies.some(isHealthPolicy);

  const emiToIncome = income > 0 ? (cash.emis / income) * 100 : undefined;
  const savingsRate = income > 0 ? ((investing + Math.max(0, cash.surplus)) / income) * 100 : undefined;

  // ---- health score ----------------------------------------------------------
  const parts: HealthPart[] = [];
  if (emiToIncome !== undefined) {
    parts.push({ key: 'debt', label: 'EMI load', weight: 25, value: `${pct(emiToIncome)} of income`, score: curve(emiToIncome, [[0, 100], [20, 100], [35, 70], [50, 30], [70, 5]]) });
  }
  if (savingsRate !== undefined) {
    parts.push({ key: 'savings', label: 'Saving rate', weight: 20, value: cash.surplus < 0 ? 'Spending more than you earn' : `${pct(savingsRate)} of income`, score: cash.surplus < 0 ? 0 : curve(savingsRate, [[0, 20], [10, 55], [20, 80], [30, 100]]) });
  }
  if (emergencyMonths !== undefined) {
    parts.push({ key: 'emergency', label: 'Emergency fund', weight: 20, value: `${emergencyMonths.toFixed(1)} months`, score: curve(emergencyMonths, [[0, 0], [1, 30], [3, 65], [6, 100]]) });
  }
  parts.push({
    key: 'expensive', label: 'Costly debt', weight: 15,
    value: expensiveDebt > 0 ? `${money(expensiveDebt)} above ${EXPENSIVE_RATE}%` : 'None',
    // Measured in months of income; carrying card balances is the costliest kind
    score: Math.min(
      expensiveDebt <= 0 ? 100 : income > 0 ? curve(expensiveDebt / income, [[0, 100], [0.25, 75], [1, 45], [3, 20], [6, 5]]) : 25,
      debts.some((d) => d.revolving) ? 35 : 100,
    ),
  });
  if (credit.percent !== undefined) {
    parts.push({ key: 'credit', label: 'Card utilisation', weight: 10, value: pct(credit.percent), score: curve(credit.percent, [[0, 100], [30, 100], [50, 70], [75, 40], [100, 10]]) });
  }
  if (income > 0) {
    const need = income * 12 * COVER_MULTIPLE;
    parts.push({ key: 'cover', label: 'Protection', weight: 10, value: hasHealthCover ? `${pct((lifeCover / need) * 100)} of life cover` : 'No health cover', score: clamp(curve(lifeCover / need, [[0, 20], [0.5, 60], [1, 100]]) - (hasHealthCover ? 0 : 30)) });
  }
  const weight = parts.reduce((s, p) => s + p.weight, 0);
  let score = weight ? Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) / weight) : 0;

  // ---- insights --------------------------------------------------------------
  const insights: Insight[] = [];
  const add = (i: Insight) => insights.push(i);
  const suggestedExtra = Math.max(0, roundTo(Math.max(0, cash.surplus) * 0.5, 500));

  if (income <= 0) {
    add({
      id: 'add-income', severity: 'high', title: 'Add your income to unlock the full plan',
      detail: 'With your take-home pay, Tenura can work out how much of it goes to EMIs, how much you can put towards closing loans early, and your savings rate.',
      action: { label: 'Add income', to: '/app/income' },
    });
  }

  if (cash.surplus < 0 && income > 0) {
    add({
      id: 'overspending', severity: 'urgent', title: `You're short by ${money(-cash.surplus)} a month`,
      detail: `EMIs, premiums, investments and spending add up to ${money(income - cash.surplus)}, but take-home pay is ${money(income)}. Trim spending or pause a recurring investment before the gap turns into card debt.`,
      impact: -cash.surplus * 12,
      action: { label: 'Review expenses', to: '/app/expenses' },
    });
  }

  const cards = debts.filter((d) => d.revolving);
  const cardDebt = cards.reduce((s, d) => s + d.principal, 0);
  if (cardDebt > 0) {
    const yearly = cards.reduce((s, d) => s + (d.principal * d.rate) / 100, 0);
    const months = cash.surplus > 0 ? Math.ceil(cardDebt / cash.surplus) : undefined;
    add({
      id: 'cards', severity: 'urgent', title: `Clear ${money(cardDebt)} of card balances first`,
      detail: `Card balances you don't pay in full cost about ${CARD_APR}% a year — far more than any loan or investment returns. ${months !== undefined ? `Putting your surplus towards them clears it in about ${months} month${months === 1 ? '' : 's'}.` : 'If you can’t pay it in one go, converting it to a card EMI (usually 14–18%) is cheaper than revolving it.'} Pay the full statement amount, not the minimum due.`,
      impact: Math.round(yearly),
      action: { label: 'See cards', to: '/app/liabilities' },
    });
  }

  if (bills > 0) {
    add({
      id: 'card-bills', severity: 'medium', title: `Pay ${money(bills)} of card bills in full by their due dates`,
      detail: `The plan assumes you clear card bills in full every month — then they cost nothing. Carrying any of it over costs about ${CARD_APR}% a year, and paying only the minimum due keeps you paying for years. If you do carry a balance, switch “Card bills” above to “I carry a balance” and the plan will put it first.`,
      action: { label: 'See cards', to: '/app/liabilities' },
    });
  }

  // Low-yield savings that could retire costly debt (never the emergency fund).
  // Each candidate is matched against debts from the most expensive down; pick the one that saves most.
  const costly = debts.filter((d) => !d.interestFree).sort((a, b) => b.rate - a.rate);
  const target = costly[0];
  const swaps = data.investments
    .filter((i) => i.status === 'active' && !i.emergencyFund && LIQUID_KINDS.has(i.kind))
    .map((i) => {
      const value = currentValue(i, today);
      const rate = i.interestRate ?? 3;
      let left = value;
      let saving = 0;
      const covered: Debt[] = [];
      for (const d of costly) {
        if (left <= 0 || d.rate - rate < 3) break;
        const take = Math.min(left, d.principal);
        saving += (take * (d.rate - rate)) / 100;
        left -= take;
        covered.push(d);
      }
      return { inv: i, rate, use: value - left, saving, covered };
    })
    .filter((x) => x.saving > 0)
    .sort((a, b) => b.saving - a.saving);
  const swap = swaps[0];
  if (swap) {
    const top = swap.covered[0];
    const names = swap.covered.slice(0, 3).map((d) => d.name).join(', ') + (swap.covered.length > 3 ? ` and ${swap.covered.length - 3} more` : '');
    add({
      id: 'use-savings', severity: 'high',
      title: `Use your ${KIND_SHORT[swap.inv.kind]} (${swap.rate}%) to clear ${money(swap.use)} of debt at up to ${top.rate}%`,
      detail: `${swap.inv.name} earns about ${swap.rate}%, while ${names} cost${swap.covered.length === 1 ? 's' : ''} up to ${top.rate}%${swap.covered.some((d) => d.rateAssumed) ? ' (some rates assumed — add the real ones)' : ''}. Moving ${money(swap.use)} across saves roughly ${money(swap.saving)} a year. Breaking an FD or RD early usually costs about 1% in interest — still well worth it at this gap. Keep your emergency fund untouched.`,
      impact: Math.round(swap.saving),
      action: { label: 'See investments', to: '/app/investments' },
    });
  }

  // EPF, PPF and NPS are long-term/tax-linked and often compulsory — only suggest pausing discretionary ones
  const recurring = data.investments.filter((i) => monthlyContribution(i) > 0 && PAUSABLE.has(i.kind));
  const pausable = recurring.reduce((s, i) => s + monthlyContribution(i), 0);
  // Only worth it when the debt is big next to what goes into investments (or it's revolving card debt)
  if (recurring.length && expensiveDebt > 0 && (expensiveDebt >= pausable * 3 || debts.some((d) => d.revolving))) {
    const amount = pausable;
    add({
      id: 'pause-investing', severity: 'medium', title: `Redirect ${money(amount)}/month from investing to costly debt — for now`,
      detail: `You're putting ${money(amount)} a month into ${recurring.map((i) => KIND_SHORT[i.kind]).filter((k, n, a) => a.indexOf(k) === n).join(' and ')} while carrying ${money(expensiveDebt)} of debt above ${EXPENSIVE_RATE}%. Investments rarely beat that rate reliably. Pausing them until the debt is cleared — then restarting — usually leaves you richer. Keep EPF and PPF going.`,
      // Roughly: a year of contributions earning the debt's rate instead of ~8%
      impact: Math.round((Math.min(amount * 12, expensiveDebt) * (Math.max(...expensive.map((d) => d.rate)) - 8)) / 100),
    });
  }

  if (emiToIncome !== undefined) {
    if (emiToIncome > 50) {
      add({ id: 'emi-load', severity: 'urgent', title: `EMIs take ${pct(emiToIncome)} of your income`, detail: 'Above 50% leaves little room for emergencies. Avoid any new loan or EMI purchase, and put any bonus or windfall towards the costliest loan.', action: { label: 'EMI schedules', to: '/app/emis' } });
    } else if (emiToIncome > 35) {
      add({ id: 'emi-load', severity: 'high', title: `EMIs take ${pct(emiToIncome)} of your income`, detail: 'Lenders prefer this under 40%, and under 30% is comfortable. Hold off on new EMIs until a current plan finishes.', action: { label: 'EMI schedules', to: '/app/emis' } });
    }
  }

  if (emergencyMonths !== undefined && emergencyMonths < 6 && income > 0) {
    const need = Math.max(0, essentials * 6 - emergencyPot);
    add({
      id: 'emergency', severity: emergencyMonths < 3 ? 'high' : 'medium',
      title: emergencyMonths < 1 ? 'Build an emergency fund' : `Emergency fund covers ${emergencyMonths.toFixed(1)} months`,
      detail: `Aim for 6 months of essentials (${money(essentials * 6)}) in a savings account, sweep FD or liquid fund — ${money(need)} to go. Mark the investment you keep for this as your emergency fund so the planner never suggests using it.`,
      action: { label: 'Investments', to: '/app/investments' },
    });
  }

  // Prepayment: what an extra amount a month does
  const payable = debts.filter((d) => !d.interestFree);
  if (payable.length && suggestedExtra > 0) {
    const start = toMonthKey(now);
    const base = simulatePayoff(debts, 0, 'current', start);
    const plan = simulatePayoff(debts, suggestedExtra, 'avalanche', start);
    const saved = base.totalInterest - plan.totalInterest;
    const sooner = base.months - plan.months;
    if (saved > 500 && !base.stuck) {
      const first = [...payable].sort((a, b) => b.rate - a.rate)[0];
      add({
        id: 'prepay', severity: 'tip', title: `Put ${money(suggestedExtra)} extra a month towards ${first.name}`,
        detail: `Paying the highest-rate debt first (the “avalanche” method) and rolling each cleared EMI into the next makes you debt-free ${sooner > 0 ? `${sooner} month${sooner === 1 ? '' : 's'} sooner` : 'on time'} and saves about ${money(saved)} in interest. Most banks allow free part-prepayment on floating-rate loans.`,
      });
    }
  }

  const noCost = debts.filter((d) => d.interestFree && !d.revolving);
  if (noCost.length) {
    add({
      id: 'no-cost', severity: 'good', title: `Keep paying ${noCost.length === 1 ? noCost[0].name : `${noCost.length} no-cost EMIs`} as scheduled`,
      detail: 'Prepaying a 0% plan saves nothing — use spare money on interest-bearing debt or savings instead. Just never miss these instalments: a missed no-cost EMI attracts penalty interest.',
    });
  }

  if (credit.percent !== undefined && credit.percent > 30) {
    add({
      id: 'utilisation', severity: 'medium', title: `Card utilisation is ${pct(credit.percent)}`,
      detail: `Credit bureaus like CIBIL prefer under 30% of your total limit (${money(credit.limit)}). Paying balances before the statement date lowers what's reported and lifts your score.`,
      action: { label: 'See cards', to: '/app/liabilities' },
    });
  }

  if (income > 0) {
    const need = income * 12 * COVER_MULTIPLE;
    if (lifeCover < need * 0.75) {
      add({
        id: 'life-cover', severity: 'medium', title: `Life cover is ${money(lifeCover)} — about ${money(need)} is the usual guide`,
        detail: `A common rule is 10× yearly income${totalPrincipal > 0 ? ` plus outstanding loans (${money(totalPrincipal)})` : ''}, so your family can clear debts and keep going. Pure term plans give the most cover per rupee of premium.`,
        action: { label: 'Insurance', to: '/app/insurance' },
      });
    }
    if (!hasHealthCover) {
      add({ id: 'health-cover', severity: 'medium', title: 'No health insurance found', detail: 'One hospital stay can undo years of saving. A family floater plan, or a top-up over your employer cover, protects the plan above.', action: { label: 'Add a policy', to: '/app/insurance' } });
    }
  }

  const traditional = activePolicies.filter((p) => !isHealthPolicy(p) && !isTermPolicy(p) && p.maturityDate);
  if (traditional.length) {
    const yearly = traditional.reduce((s, p) => s + annualPremium(p), 0);
    add({
      id: 'endowment', severity: 'tip', title: `${traditional.length === 1 ? traditional[0].name : `${traditional.length} savings-type policies`}: know what they return`,
      detail: `You pay ${money(yearly)} a year. Endowment and money-back plans usually return around 4–6% a year. Don't surrender them in a hurry — early surrender loses money — but compare before buying another, and make sure your life cover comes from term insurance.`,
    });
  }

  const soon = data.investments
    .filter((i) => i.status === 'active' && i.maturityDate && !i.emergencyFund)
    .map((i) => ({ i, days: daysBetween(today, i.maturityDate!) }))
    .filter((x) => x.days >= 0 && x.days <= 90)
    .sort((a, b) => a.days - b.days)[0];
  if (soon && target) {
    add({
      id: 'maturing', severity: 'tip', title: `${soon.i.name} matures in ${soon.days} days`,
      detail: `Instead of renewing it automatically, consider using ${money(currentValue(soon.i, today))} to prepay ${target.name} at ${target.rate}%.`,
      action: { label: 'Investments', to: '/app/investments' },
    });
  }

  // Good news, so the page isn't only warnings
  if (cardDebt === 0 && bills === 0 && data.liabilities.some((l) => l.kind === 'credit_card')) {
    add({ id: 'cards-clear', severity: 'good', title: 'No credit card debt', detail: 'You’re paying cards in full — the single best habit for your credit score.' });
  }
  if (savingsRate !== undefined && savingsRate >= 20 && cash.surplus >= 0) {
    add({ id: 'saver', severity: 'good', title: `You save ${pct(savingsRate)} of your income`, detail: '20% or more puts you ahead of most households. Keep it automatic.' });
  }

  // Something urgent can't sit next to an "Excellent" grade
  if (insights.some((i) => i.severity === 'urgent')) score = Math.min(score, 70);
  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Needs attention';

  const ORDER: Severity[] = ['urgent', 'high', 'medium', 'tip', 'good'];
  insights.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity) || (b.impact ?? 0) - (a.impact ?? 0));

  return {
    today,
    cash,
    debts,
    cardsCarried,
    cardBills: bills,
    totalPrincipal,
    expensiveDebt,
    emiToIncome,
    savingsRate,
    emergencyPot: Math.round(emergencyPot),
    emergencyMonths,
    creditUtilisation: credit.percent,
    lifeCover,
    hasHealthCover,
    portfolio,
    netWorth: portfolio.value - totalPrincipal,
    health: { score, grade, parts },
    suggestedExtra,
    insights,
  };
}

const KIND_SHORT: Record<Investment['kind'], string> = {
  sip: 'SIP', mutual_fund: 'mutual fund', stocks: 'shares', fd: 'FD', rd: 'RD', ppf: 'PPF',
  epf: 'EPF', nps: 'NPS', gold: 'gold', savings: 'savings', other: 'investment',
};

/** Compact, anonymised summary of the plan for the AI explainer — no names of people, no account numbers. */
export function planSnapshot(plan: MoneyPlan, data: FinanceData) {
  const today = plan.today;
  // Card last-4s appear in debt names ("SBI Card ··7713"); strip them from everything sent
  const clean = (s: string) => s.replace(/\s*··\d{4}/g, '');
  return {
    currency: 'INR',
    country: 'IN',
    month: today.slice(0, 7),
    householdSize: data.members.length,
    cashFlowPerMonth: plan.cash,
    ratios: {
      emiToIncomePct: plan.emiToIncome && Math.round(plan.emiToIncome),
      savingsRatePct: plan.savingsRate && Math.round(plan.savingsRate),
      emergencyFundMonths: plan.emergencyMonths && Number(plan.emergencyMonths.toFixed(1)),
      cardUtilisationPct: plan.creditUtilisation && Math.round(plan.creditUtilisation),
    },
    healthScore: plan.health.score,
    debts: plan.debts.map((d) => ({
      name: clean(d.name), kind: d.kind, principalLeft: d.principal, ratePct: d.rate, rateAssumed: d.rateAssumed,
      monthlyPayment: d.payment, monthsLeft: d.monthsLeft, revolvingCard: d.revolving, interestFree: d.interestFree,
    })),
    investments: data.investments
      .filter((i) => i.status !== 'closed')
      .map((i) => ({
        kind: i.kind, name: clean(i.name), value: currentValue(i, today), invested: investedSoFar(i, today),
        monthly: Math.round(monthlyContribution(i)), ratePct: i.interestRate, maturity: i.maturityDate, emergencyFund: i.emergencyFund,
      })),
    creditCards: { billsDueThisCycle: plan.cardBills, paysInFullEachMonth: !plan.cardsCarried },
    insurance: { lifeCover: plan.lifeCover, hasHealthCover: plan.hasHealthCover },
    engineFindings: plan.insights.map((i) => ({ severity: i.severity, title: clean(i.title), detail: clean(i.detail), yearlyImpact: i.impact })),
  };
}
