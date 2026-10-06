import { describe, expect, it } from 'vitest';
import type { FinanceData, Investment, Member } from './types';
import { calculateEmi, currentValue, investedSoFar, maturityValue, portfolioSummary, totalMonthlyIncome } from './calc';
import { buildMoneyPlan, planSnapshot, simulatePayoff, type Debt } from './advisor';
import { buildSampleData } from './sample';

const TODAY = '2026-10-06';
const me: Member = { id: 'm1', name: 'Aarav', relation: 'Self', color: 'blue', monthlyBudget: 50000, isPrimary: true };
const empty = (over: Partial<FinanceData> = {}): FinanceData => ({
  members: [me], liabilities: [], installments: [], expenses: [], policies: [], incomes: [], investments: [], ...over,
});
const inv = (over: Partial<Investment>): Investment => ({
  id: 'i1', memberId: 'm1', kind: 'fd', provider: 'SBI', name: 'FD', invested: 0, emergencyFund: false, status: 'active', ...over,
});
const debt = (over: Partial<Debt>): Debt => ({
  id: 'd', name: 'Debt', memberId: 'm1', kind: 'loan', principal: 0, outstanding: 0, rate: 12, rateAssumed: false,
  payment: 0, revolving: false, interestFree: false, ...over,
});

describe('investments', () => {
  it('grows an FD with quarterly compounding', () => {
    const fd = inv({ invested: 100000, interestRate: 7, startDate: '2025-10-06' });
    expect(currentValue(fd, TODAY)).toBe(Math.round(100000 * Math.pow(1.0175, 4)));
  });

  it('estimates what has gone into an RD from its start date', () => {
    const rd = inv({ kind: 'rd', contribution: 5000, frequency: 'monthly', startDate: '2025-08-06', interestRate: 6.7 });
    expect(investedSoFar(rd, TODAY)).toBe(15 * 5000);
    expect(currentValue(rd, TODAY)).toBeGreaterThan(75000);
    expect(maturityValue({ ...rd, maturityDate: '2030-08-06' }, TODAY)).toBeGreaterThan(5000 * 60);
  });

  it('uses the entered value for market-linked investments and never invents growth', () => {
    const sip = inv({ kind: 'sip', contribution: 10000, frequency: 'monthly', startDate: '2024-10-06', interestRate: 12 });
    expect(currentValue(sip, TODAY)).toBe(investedSoFar(sip, TODAY));
    expect(currentValue({ ...sip, currentValue: 312000 }, TODAY)).toBe(312000);
  });

  it('summarises a portfolio, counting the emergency fund separately', () => {
    const p = portfolioSummary([
      inv({ id: 'a', invested: 100000 }),
      inv({ id: 'b', kind: 'savings', invested: 50000, emergencyFund: true }),
      inv({ id: 'c', kind: 'sip', contribution: 2000, frequency: 'monthly', invested: 40000, currentValue: 50000 }),
      inv({ id: 'd', invested: 999999, status: 'closed' }),
    ], TODAY);
    expect(p.value).toBe(200000);
    expect(p.invested).toBe(190000);
    expect(p.emergencyFund).toBe(50000);
    expect(p.monthlyContributions).toBe(2000);
  });
});

describe('payoff simulation', () => {
  it('matches the EMI schedule when nothing extra is paid', () => {
    const emi = calculateEmi(100000, 12, 12);
    const r = simulatePayoff([debt({ principal: 100000, payment: emi })], 0, 'current', '2026-10');
    expect(r.months).toBe(12);
    expect(r.debtFreeMonth).toBe('2027-09');
    expect(Math.abs(r.totalInterest - (emi * 12 - 100000))).toBeLessThan(15);
  });

  it('paying extra finishes sooner and costs less interest', () => {
    const d = [debt({ principal: 300000, payment: calculateEmi(300000, 11.5, 36) })];
    const base = simulatePayoff(d, 0, 'current', '2026-10');
    const faster = simulatePayoff(d, 5000, 'avalanche', '2026-10');
    expect(faster.months).toBeLessThan(base.months);
    expect(faster.totalInterest).toBeLessThan(base.totalInterest);
  });

  it('avalanche saves more interest; snowball clears the small debt first', () => {
    const debts = [
      debt({ id: 'big', name: 'Big', principal: 60000, rate: 36, payment: 3000 }),
      debt({ id: 'small', name: 'Small', principal: 8000, rate: 10, payment: 1000 }),
    ];
    const avalanche = simulatePayoff(debts, 4000, 'avalanche', '2026-10');
    const snowball = simulatePayoff(debts, 4000, 'snowball', '2026-10');
    expect(avalanche.totalInterest).toBeLessThan(snowball.totalInterest);
    expect(snowball.order[0].id).toBe('small');
  });

  it('flags debts that minimum payments never clear', () => {
    const r = simulatePayoff([debt({ principal: 100000, rate: 42, payment: 100 })], 0, 'current', '2026-10');
    expect(r.stuck).toBe(true);
    expect(r.debtFreeMonth).toBeUndefined();
  });
});

describe('money plan', () => {
  const sample = buildSampleData('Aarav', new Date('2026-10-06T09:00:00'));

  it('treats card balances as bills paid in full unless the user carries them', () => {
    const plan = buildMoneyPlan(sample, new Date('2026-10-06T09:00:00'));
    expect(plan.health.score).toBeGreaterThan(0);
    expect(plan.health.score).toBeLessThanOrEqual(100);
    expect(totalMonthlyIncome(sample.incomes)).toBe(plan.cash.income);
    expect(plan.debts.some((d) => d.revolving)).toBe(false);
    expect(plan.cardBills).toBe(99500);
    expect(plan.insights.some((i) => i.id === 'card-bills')).toBe(true);
    expect(plan.insights.some((i) => i.id === 'cards')).toBe(false);
  });

  it('puts carried card debt first, at the top of the plan', () => {
    const plan = buildMoneyPlan(sample, new Date('2026-10-06T09:00:00'), { cardsCarried: true });
    expect(plan.cardBills).toBe(0);
    expect(plan.insights[0].id).toBe('cards');
    expect(plan.insights[0].severity).toBe('urgent');
    expect(plan.health.score).toBeLessThan(buildMoneyPlan(sample, new Date('2026-10-06T09:00:00')).health.score);
  });

  it('suggests a low-yield FD for costly debt, but never the emergency fund', () => {
    const plan = buildMoneyPlan(sample, new Date('2026-10-06T09:00:00'));
    const use = plan.insights.find((i) => i.id === 'use-savings');
    expect(use?.title).toMatch(/FD/);
    expect(use?.detail).toContain('SBI Fixed Deposit');

    const onlyEmergency = { ...sample, investments: sample.investments.map((i) => ({ ...i, emergencyFund: true })) };
    expect(buildMoneyPlan(onlyEmergency).insights.some((i) => i.id === 'use-savings')).toBe(false);
  });

  it('asks for income when there is none, and leaves the EMI load out of the score', () => {
    const plan = buildMoneyPlan(empty({ liabilities: [{ id: 'l1', memberId: 'm1', provider: 'SBI Card', kind: 'credit_card', status: 'active', balance: 20000, createdAt: '' }] }));
    expect(plan.insights.some((i) => i.id === 'add-income')).toBe(true);
    expect(plan.health.parts.some((p) => p.key === 'debt')).toBe(false);
  });

  it('flags overspending', () => {
    const plan = buildMoneyPlan(
      empty({
        incomes: [{ id: 'x', memberId: 'm1', kind: 'salary', source: 'Job', amount: 30000, frequency: 'monthly', isActive: true }],
        expenses: [{ id: 'e', memberId: 'm1', title: 'Rent', amount: 45000, category: 'housing', date: '2026-09-02', paymentMethod: 'UPI', isRecurring: true }],
      }),
      new Date('2026-10-06T09:00:00'),
    );
    expect(plan.cash.surplus).toBe(-15000);
    expect(plan.insights[0].id).toBe('overspending');
  });

  it('sends the AI only amounts and types — no people, card or account numbers', () => {
    const plan = buildMoneyPlan(sample, new Date('2026-10-06T09:00:00'), { cardsCarried: true });
    const text = JSON.stringify(planSnapshot(plan, sample));
    for (const secret of ['Aarav', 'Didi', 'Mom', '4021', '7713', '892341092', '··']) expect(text).not.toContain(secret);
    expect(text).toContain('IndusInd Bank');
  });
});

describe('balance-type investments', () => {
  it('treats the PPF/EPF/savings amount as today’s balance and only grows it forward', () => {
    const ppf = inv({ kind: 'ppf', invested: 410000, interestRate: 7.1, startDate: '2020-12-06', maturityDate: '2027-10-06' });
    expect(currentValue(ppf, TODAY)).toBe(410000);
    expect(maturityValue(ppf, TODAY)).toBe(Math.round(410000 * Math.pow(1 + 7.1 / 400, 4)));
  });
});
