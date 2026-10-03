import { describe, expect, it } from 'vitest';
import {
  buildInstallments,
  calculateEmi,
  cardUsage,
  creditTotals,
  debtMix,
  monthEmiProgress,
  utilizationTone,
  emiBreakdown,
  nextPremiumDateAfterPayment,
  outstandingFor,
  projectOutflow,
  scopeData,
  summarize,
  upcomingPayments,
} from './calc';
import { addMonthsToDate, addMonthsToKey, dateInMonth } from './dates';
import { applyMutation } from './mutations';
import { parseBackup, makeBackup } from './backup';
import { buildSampleData } from './sample';
import { formatINRCompact } from '../format';
import type { FinanceData, Liability, Member, Policy } from './types';

let counter = 0;
const id = () => `id-${++counter}`;

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm1', name: 'Gaurav', relation: 'Self', color: 'blue', monthlyBudget: 50000, isPrimary: true, ...over,
});
const liability = (over: Partial<Liability> = {}): Liability => ({
  id: 'l1', memberId: 'm1', provider: 'SBI Card', kind: 'credit_card', status: 'active',
  balance: 26000, createdAt: '2026-01-01T00:00:00Z', ...over,
});
const data = (over: Partial<FinanceData> = {}): FinanceData => ({
  members: [member()], liabilities: [], installments: [], expenses: [], policies: [], ...over,
});

describe('dates', () => {
  it('rolls month keys across years', () => {
    expect(addMonthsToKey('2026-11', 3)).toBe('2027-02');
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12');
  });
  it('clamps day-of-month when adding months', () => {
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2027-11-30', 3)).toBe('2028-02-29');
  });
  it('clamps due day to month length', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
  });
});

describe('EMI maths', () => {
  it('matches the reducing-balance formula', () => {
    // ₹1,00,000 at 12% for 12 months → ₹8,885 (standard bank figure)
    expect(calculateEmi(100000, 12, 12)).toBe(8885);
  });
  it('splits evenly for no-cost EMI', () => {
    expect(calculateEmi(27972, 0, 12)).toBe(2331);
  });
  it('returns 0 for invalid input', () => {
    expect(calculateEmi(0, 10, 12)).toBe(0);
    expect(calculateEmi(1000, 10, 0)).toBe(0);
  });
  it('reports interest as payable minus principal', () => {
    const b = emiBreakdown(150000, 14, 24);
    expect(b.totalPayable).toBe(b.emi * 24);
    expect(b.totalInterest).toBe(b.totalPayable - 150000);
  });
  it('builds consecutive monthly installments', () => {
    const rows = buildInstallments('l1', 2880, 9, '2026-10', id);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ seq: 1, dueMonth: '2026-10', amount: 2880 });
    expect(rows[8].dueMonth).toBe('2027-06');
  });
});

describe('summary', () => {
  const plan = liability({ id: 'l2', provider: 'AC EMI', kind: 'emi', balance: 27972, emiAmount: 2331, tenureMonths: 12, startMonth: '2026-08' });
  const inst = buildInstallments('l2', 2331, 12, '2026-08', id);
  inst[0].paidOn = '2026-08-05';

  it('counts unpaid installments as outstanding, not the original principal', () => {
    expect(outstandingFor(plan, inst)).toBe(2331 * 11);
  });

  it('excludes closed liabilities from outstanding but counts them as repaid', () => {
    const s = summarize(
      data({
        liabilities: [liability(), plan, liability({ id: 'l3', status: 'closed', balance: 4000 })],
        installments: inst,
      }),
      new Date(2026, 9, 2),
    );
    expect(s.outstanding).toBe(26000 + 2331 * 11);
    expect(s.creditCardOutstanding).toBe(26000);
    expect(s.repaid).toBe(2331 + 4000);
    expect(s.monthlyEmi).toBe(2331);
    expect(s.openCount).toBe(2);
    expect(s.closedCount).toBe(1);
    expect(s.debtFreeMonth).toBe('2027-07');
  });

  it('only counts this month’s expenses against the budget', () => {
    const s = summarize(
      data({
        expenses: [
          { id: 'e1', memberId: 'm1', title: 'Rent', amount: 18000, category: 'housing', date: '2026-10-01', paymentMethod: 'UPI', isRecurring: true },
          { id: 'e2', memberId: 'm1', title: 'Old', amount: 999, category: 'other', date: '2026-09-30', paymentMethod: 'UPI', isRecurring: false },
        ],
      }),
      new Date(2026, 9, 2),
    );
    expect(s.spentThisMonth).toBe(18000);
    expect(s.monthlyBudget).toBe(50000);
  });
});

describe('upcoming payments', () => {
  const policy: Policy = {
    id: 'p1', memberId: 'm1', provider: 'LIC', name: 'Jeevan Labh', premium: 48500, frequency: 'yearly',
    sumAssured: 1200000, nextDueDate: '2026-10-11', status: 'active',
  };

  it('lists the next installment, card bills and premiums, soonest first', () => {
    const inst = buildInstallments('l2', 2331, 3, '2026-09', id);
    const items = upcomingPayments(
      data({
        liabilities: [
          liability({ dueDay: 7 }),
          liability({ id: 'l2', kind: 'emi', provider: 'AC EMI', emiAmount: 2331, tenureMonths: 3 }),
        ],
        installments: inst,
        policies: [policy],
      }),
      '2026-10-02',
    );
    expect(items.map((i) => i.kind)).toEqual(['installment', 'card', 'premium']);
    expect(items[0]).toMatchObject({ date: '2026-09-05', days: -27 }); // September EMI is overdue
    expect(items[1]).toMatchObject({ date: '2026-10-07', amount: 26000 });
  });

  it('skips closed liabilities and items beyond the horizon', () => {
    const items = upcomingPayments(
      data({ liabilities: [liability({ status: 'closed', dueDay: 7 })], policies: [{ ...policy, nextDueDate: '2027-03-01' }] }),
      '2026-10-02',
    );
    expect(items).toEqual([]);
  });

  it('advances a premium by its frequency', () => {
    expect(nextPremiumDateAfterPayment({ ...policy, frequency: 'quarterly' })).toBe('2027-01-11');
  });
});

describe('projections', () => {
  it('rolls overdue installments into the current month', () => {
    const inst = buildInstallments('l2', 1000, 3, '2026-09', id);
    const rows = projectOutflow(
      data({ liabilities: [liability({ id: 'l2', kind: 'emi' })], installments: inst }),
      new Date(2026, 9, 2),
      3,
    );
    expect(rows.map((r) => r.emi)).toEqual([2000, 1000, 0]);
  });
});

describe('mutations', () => {
  it('moves records to another member when a member is removed', () => {
    const d = data({
      members: [member(), member({ id: 'm2', name: 'Didi', isPrimary: false })],
      liabilities: [liability({ memberId: 'm2' })],
    });
    const next = applyMutation(d, { type: 'member/remove', id: 'm2', reassignTo: 'm1' });
    expect(next.members).toHaveLength(1);
    expect(next.liabilities[0].memberId).toBe('m1');
  });

  it('replaces, keeps or removes a plan depending on `installments`', () => {
    const inst = buildInstallments('l1', 100, 2, '2026-10', id);
    let d = applyMutation(data(), { type: 'liability/upsert', liability: liability(), installments: inst });
    expect(d.installments).toHaveLength(2);
    d = applyMutation(d, { type: 'liability/upsert', liability: liability({ balance: 1 }) });
    expect(d.installments).toHaveLength(2);
    d = applyMutation(d, { type: 'liability/upsert', liability: liability(), installments: null });
    expect(d.installments).toHaveLength(0);
  });

  it('removes a liability together with its installments', () => {
    const inst = buildInstallments('l1', 100, 2, '2026-10', id);
    const d = applyMutation(data({ liabilities: [liability()], installments: inst }), { type: 'liability/remove', id: 'l1' });
    expect(d.liabilities).toHaveLength(0);
    expect(d.installments).toHaveLength(0);
  });
});

describe('scope', () => {
  it('filters everything to one member', () => {
    const sample = buildSampleData('Gaurav', new Date(2026, 9, 2));
    const didi = sample.members[1];
    const scoped = scopeData(sample, didi.id);
    expect(scoped.liabilities.every((l) => l.memberId === didi.id)).toBe(true);
    const ids = new Set(scoped.liabilities.map((l) => l.id));
    expect(scoped.installments.every((i) => ids.has(i.liabilityId))).toBe(true);
  });
});

describe('backup', () => {
  it('round-trips a v3 backup', () => {
    const sample = buildSampleData('Gaurav', new Date(2026, 9, 2));
    const parsed = parseBackup(JSON.stringify(makeBackup(sample)));
    expect(parsed.ok && parsed.data).toEqual(sample);
  });

  it('imports a v2 export from the previous app version', () => {
    const legacy = {
      version: '2.0',
      profiles: [{ id: 'gaurav', name: 'Gaurav', role: 'Primary Account', monthlyBudget: 75000 }],
      liabilities: [{ id: 'liab-3', profileId: 'gaurav', providerName: 'IDFC', type: 'credit_card', amount: 25000, status: 'converted_to_emi', emiAmount: 2880, tenure: 9 }],
      schedules: [{ liabilityId: 'liab-3', months: [{ id: 'm-1', monthDate: '2026-10', installmentIndex: 1, amount: 2880, isPaid: true, paidDate: '2026-10-03' }] }],
      expenses: [{ id: 'exp-1', profileId: 'gaurav', title: 'Groceries', amount: 4500, category: 'food_groceries', date: '2026-09-20', paymentMethod: 'UPI' }],
    };
    const parsed = parseBackup(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const [l] = parsed.data.liabilities;
    expect(l).toMatchObject({ status: 'converted', balance: 25000, tenureMonths: 9 });
    expect(l.memberId).toBe(parsed.data.members[0].id);
    expect(parsed.data.installments[0]).toMatchObject({ liabilityId: l.id, paidOn: '2026-10-03' });
    expect(parsed.data.expenses[0].category).toBe('groceries');
    expect(parsed.data.members[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects junk', () => {
    expect(parseBackup('nope').ok).toBe(false);
    expect(parseBackup('{"foo":1}').ok).toBe(false);
  });
});

describe('compact currency', () => {
  it('uses the Indian short scale', () => {
    expect(formatINRCompact(99500)).toBe('₹99.5k');
    expect(formatINRCompact(125000)).toBe('₹1.25L');
    expect(formatINRCompact(1000000)).toBe('₹10L');
    expect(formatINRCompact(12000000)).toBe('₹1.2Cr');
    expect(formatINRCompact(950)).toBe('₹950');
  });
});

describe('credit cards & overview helpers', () => {
  it('reports card utilisation against the limit', () => {
    const u = cardUsage(liability({ balance: 30000, creditLimit: 100000 }), []);
    expect(u).toMatchObject({ used: 30000, available: 70000, percent: 30 });
    expect(utilizationTone(30)).toBe('positive');
    expect(utilizationTone(50)).toBe('warning');
    expect(utilizationTone(90)).toBe('negative');
    expect(cardUsage(liability(), []).percent).toBeUndefined();
  });

  it('totals only open cards with a limit', () => {
    const t = creditTotals(data({
      liabilities: [
        liability({ creditLimit: 100000, balance: 25000 }),
        liability({ id: 'l2', creditLimit: 50000, balance: 0, status: 'closed' }),
        liability({ id: 'l3', balance: 9000 }),
      ],
    }));
    expect(t).toMatchObject({ limit: 100000, used: 25000, cards: 1, percent: 25 });
  });

  it('splits debt by kind, counting converted card balances as EMIs', () => {
    const inst = buildInstallments('l2', 1000, 3, '2026-10', id);
    const mix = debtMix(data({
      liabilities: [liability(), liability({ id: 'l2', status: 'converted', emiAmount: 1000, tenureMonths: 3 }), liability({ id: 'l3', kind: 'loan', balance: 5000 })],
      installments: inst,
    }));
    expect(mix).toEqual({ cards: 26000, loans: 5000, emis: 3000, bnpl: 0 });
  });

  it('tracks this month’s EMIs paid vs due', () => {
    const inst = buildInstallments('l2', 1000, 2, '2026-10', id);
    inst[0].paidOn = '2026-10-04';
    const p = monthEmiProgress(data({ liabilities: [liability({ id: 'l2', kind: 'emi' })], installments: inst }), '2026-10');
    expect(p).toMatchObject({ due: 1000, paid: 1000, count: 1, paidCount: 1, percent: 100 });
  });
});
