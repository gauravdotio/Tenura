import type { Expense, FinanceData, Income, Installment, Investment, Liability, Member, Policy } from './types';
import { addMonthsToDate, addMonthsToKey, toISODate, toMonthKey } from './dates';
import { buildInstallments, calculateEmi } from './calc';

export const newId = (): string => crypto.randomUUID();

/** A primary member for a brand-new account. */
export function primaryMember(name: string): Member {
  return { id: newId(), name, relation: 'Self', color: 'blue', monthlyBudget: 50000, isPrimary: true };
}

/**
 * A realistic household, dated relative to `today` so the dashboard always has
 * something due soon, some EMIs already paid and some spending this month.
 */
export function buildSampleData(primaryName: string, today: Date = new Date()): FinanceData {
  const thisMonth = toMonthKey(today);
  const todayIso = toISODate(today);
  const day = (offset: number) => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));

  const me: Member = { ...primaryMember(primaryName), monthlyBudget: 60000 };
  const sister: Member = { id: newId(), name: 'Didi', relation: 'Sibling', color: 'teal', monthlyBudget: 40000, isPrimary: false };
  const mom: Member = { id: newId(), name: 'Mom', relation: 'Parent', color: 'violet', monthlyBudget: 25000, isPrimary: false };

  const liabilities: Liability[] = [];
  const installments: Installment[] = [];
  const createdAt = new Date(today.getTime() - 90 * 86_400_000).toISOString();

  const card = (memberId: string, provider: string, last4: string, balance: number, dueDay: number, notes?: string) =>
    liabilities.push({ id: newId(), memberId, provider, kind: 'credit_card', status: 'active', balance, dueDay, cardLast4: last4, notes, createdAt });

  const plan = (
    base: Omit<Liability, 'id' | 'createdAt' | 'emiAmount' | 'startMonth'>,
    monthsAgo: number,
    paid: number,
  ) => {
    const id = newId();
    const emi = calculateEmi(base.balance, base.interestRate ?? 0, base.tenureMonths!);
    const startMonth = addMonthsToKey(thisMonth, -monthsAgo);
    liabilities.push({ ...base, id, emiAmount: emi, startMonth, createdAt });
    const rows = buildInstallments(id, emi, base.tenureMonths!, startMonth, newId);
    rows.slice(0, paid).forEach((r) => (r.paidOn = `${r.dueMonth}-04`));
    installments.push(...rows);
  };

  card(me.id, 'IndusInd Bank', '4021', 30000, 18, 'Shopping & rewards');
  card(me.id, 'SBI Card', '7713', 26000, 7, 'Fuel & utilities');
  card(me.id, 'RBL Bank', '0934', 25000, 22, 'Travel & dining');
  plan({ memberId: me.id, provider: 'IDFC FIRST Bank', kind: 'credit_card', status: 'converted', balance: 25000, interestRate: 15, tenureMonths: 9, cardLast4: '5560', notes: 'Card balance converted to EMI' }, 2, 2);
  plan({ memberId: me.id, provider: 'Bajaj Finserv — 1.5T Inverter AC', kind: 'emi', status: 'active', balance: 27972, interestRate: 0, tenureMonths: 12 }, 3, 3);
  plan({ memberId: me.id, provider: 'HDFC Bank Personal Loan', kind: 'loan', status: 'active', balance: 300000, interestRate: 11.5, tenureMonths: 36, notes: 'Home renovation' }, 8, 8);
  card(sister.id, 'HDFC Regalia', '1188', 18500, 12);
  plan({ memberId: sister.id, provider: 'MacBook Air (Apple via HDFC)', kind: 'emi', status: 'active', balance: 54000, interestRate: 0, tenureMonths: 6 }, 2, 2);
  plan({ memberId: mom.id, provider: 'Simpl Pay-in-3', kind: 'bnpl', status: 'active', balance: 6000, interestRate: 0, tenureMonths: 3 }, 0, 0);
  liabilities.push({ id: newId(), memberId: me.id, provider: 'Amazon Pay Later', kind: 'bnpl', status: 'closed', balance: 4200, notes: 'Settled', createdAt });

  const expense = (memberId: string, title: string, amount: number, category: Expense['category'], offset: number, paymentMethod = 'UPI', isRecurring = false): Expense => ({
    id: newId(), memberId, title, amount, category, date: day(offset), paymentMethod, isRecurring,
  });
  // keep every sample expense inside the current month
  const back = (n: number) => -Math.min(n, today.getDate() - 1);
  const expenses: Expense[] = [
    expense(me.id, 'House rent', 18000, 'housing', back(25), 'Bank transfer', true),
    expense(me.id, 'Electricity bill', 3200, 'utilities', back(12), 'UPI', true),
    expense(me.id, 'Fibre internet', 999, 'utilities', back(10), 'Credit card', true),
    expense(me.id, 'Groceries — BigBasket', 4500, 'groceries', back(6)),
    expense(me.id, 'Fuel', 2500, 'transport', back(4), 'Credit card'),
    expense(me.id, 'Dinner with friends', 1850, 'dining', back(2)),
    expense(sister.id, 'Gym membership', 1500, 'health', back(9), 'UPI', true),
    expense(sister.id, 'Online course', 3499, 'education', back(5), 'Credit card'),
    expense(mom.id, 'Medicines', 1240, 'health', back(3), 'Cash'),
    expense(mom.id, 'Vegetables & milk', 2100, 'groceries', back(1), 'UPI'),
  ];

  const policies: Policy[] = [
    { id: newId(), memberId: me.id, provider: 'LIC of India', name: 'Jeevan Labh (Plan 936)', policyNumber: '892341092', premium: 48500, frequency: 'yearly', sumAssured: 1200000, nextDueDate: day(9), maturityDate: '2042-03-15', status: 'active', notes: 'Endowment plan · 80C' },
    { id: newId(), memberId: me.id, provider: 'HDFC Life', name: 'Click 2 Protect Super (Term)', policyNumber: '441092831', premium: 1520, frequency: 'monthly', sumAssured: 10000000, nextDueDate: day(3), maturityDate: '2056-11-20', status: 'active' },
    { id: newId(), memberId: mom.id, provider: 'LIC of India', name: 'Jeevan Anand', policyNumber: '771203345', premium: 9800, frequency: 'quarterly', sumAssured: 500000, nextDueDate: addMonthsToDate(todayIso, 2), maturityDate: '2031-06-01', status: 'active' },
    { id: newId(), memberId: sister.id, provider: 'Star Health', name: 'Family Health Optima', premium: 21600, frequency: 'yearly', sumAssured: 1000000, nextDueDate: addMonthsToDate(todayIso, 5), status: 'active', notes: 'Health cover · 80D' },
  ];

  const incomes: Income[] = [
    { id: newId(), memberId: me.id, kind: 'salary', source: 'Infosys', amount: 110000, frequency: 'monthly', isActive: true },
    { id: newId(), memberId: me.id, kind: 'rental', source: 'Flat 2B rent', amount: 14000, frequency: 'monthly', isActive: true },
    { id: newId(), memberId: sister.id, kind: 'salary', source: 'Deloitte', amount: 68000, frequency: 'monthly', isActive: true },
    { id: newId(), memberId: mom.id, kind: 'pension', source: 'Family pension', amount: 18000, frequency: 'monthly', isActive: true },
  ];

  const monthsAgo = (n: number) => addMonthsToDate(todayIso, -n);
  const inMonths = (n: number) => addMonthsToDate(todayIso, n);
  const investments: Investment[] = [
    { id: newId(), memberId: me.id, kind: 'sip', provider: 'Parag Parikh MF', name: 'Flexi Cap Fund — SIP', contribution: 10000, frequency: 'monthly', invested: 0, currentValue: 312000, startDate: monthsAgo(26), emergencyFund: false, status: 'active' },
    { id: newId(), memberId: me.id, kind: 'fd', provider: 'SBI', name: 'SBI Fixed Deposit', invested: 200000, interestRate: 7.1, startDate: monthsAgo(10), maturityDate: inMonths(2), emergencyFund: false, status: 'active' },
    { id: newId(), memberId: me.id, kind: 'savings', provider: 'HDFC Bank', name: 'Savings account', invested: 95000, interestRate: 3, emergencyFund: true, status: 'active' },
    { id: newId(), memberId: me.id, kind: 'epf', provider: 'EPFO', name: 'Provident Fund', contribution: 3600, frequency: 'monthly', invested: 248000, interestRate: 8.25, emergencyFund: false, status: 'active' },
    { id: newId(), memberId: me.id, kind: 'ppf', provider: 'SBI', name: 'PPF account', invested: 410000, interestRate: 7.1, startDate: monthsAgo(70), maturityDate: inMonths(110), emergencyFund: false, status: 'active' },
    { id: newId(), memberId: sister.id, kind: 'rd', provider: 'India Post', name: 'Recurring Deposit', contribution: 5000, frequency: 'monthly', invested: 0, interestRate: 6.7, startDate: monthsAgo(14), maturityDate: inMonths(46), emergencyFund: false, status: 'active' },
    { id: newId(), memberId: mom.id, kind: 'fd', provider: 'Post Office SCSS', name: 'Senior Citizens Savings', invested: 500000, interestRate: 8.2, startDate: monthsAgo(20), maturityDate: inMonths(40), emergencyFund: true, status: 'active' },
    { id: newId(), memberId: mom.id, kind: 'gold', provider: 'Tanishq', name: 'Gold jewellery & coins', invested: 150000, currentValue: 236000, emergencyFund: false, status: 'active' },
  ];

  return { members: [me, sister, mom], liabilities, installments, expenses, policies, incomes, investments };
}
