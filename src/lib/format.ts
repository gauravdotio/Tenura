import type { CardNetwork, ExpenseCategory, IncomeKind, InvestmentKind, InvestmentStatus, LiabilityKind, LiabilityStatus, MemberColor, PremiumFrequency } from './finance/types';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return inr.format(Number.isFinite(amount) ? amount : 0);
}

/** ₹4,500 · ₹1.2L · ₹3.4Cr — Indian short scale. */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  const trim = (n: number) => String(Number(n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)));
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

export const KIND_LABEL: Record<LiabilityKind, string> = {
  credit_card: 'Credit card',
  loan: 'Loan',
  emi: 'Consumer EMI',
  bnpl: 'Pay later',
};

export const STATUS_LABEL: Record<LiabilityStatus, string> = {
  active: 'Active',
  converted: 'Converted to EMI',
  closed: 'Paid off',
};

export const FREQUENCY_LABEL: Record<PremiumFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  yearly: 'Yearly',
};

export const FREQUENCY_SUFFIX: Record<PremiumFrequency, string> = {
  monthly: '/mo',
  quarterly: '/qtr',
  half_yearly: '/6 mo',
  yearly: '/yr',
};

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  housing: 'Rent & housing',
  utilities: 'Bills & utilities',
  groceries: 'Groceries',
  dining: 'Food & dining',
  shopping: 'Shopping',
  transport: 'Transport & fuel',
  health: 'Health & fitness',
  education: 'Education',
  entertainment: 'Entertainment',
  other: 'Other',
};

export const PAYMENT_METHODS = ['UPI', 'Credit card', 'Debit card', 'Cash', 'Bank transfer', 'Auto-debit'];

/** Member colour → classes for avatar chips. Static strings so Tailwind keeps them. */
export const MEMBER_COLOR: Record<MemberColor, { dot: string; chip: string; label: string }> = {
  blue: { dot: 'bg-[#2a78d6]', chip: 'bg-[#2a78d6] text-white', label: 'Blue' },
  teal: { dot: 'bg-[#13917a]', chip: 'bg-[#13917a] text-white', label: 'Teal' },
  violet: { dot: 'bg-[#6a5acd]', chip: 'bg-[#6a5acd] text-white', label: 'Violet' },
  amber: { dot: 'bg-[#c98500]', chip: 'bg-[#c98500] text-white', label: 'Amber' },
  rose: { dot: 'bg-[#d4507a]', chip: 'bg-[#d4507a] text-white', label: 'Rose' },
  slate: { dot: 'bg-[#5f6b7a]', chip: 'bg-[#5f6b7a] text-white', label: 'Slate' },
};

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join('') || '?'
  );
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'American Express',
  diners: 'Diners Club',
};

export const INCOME_KIND_LABEL: Record<IncomeKind, string> = {
  salary: 'Salary',
  business: 'Business',
  freelance: 'Freelance',
  rental: 'Rent received',
  pension: 'Pension',
  interest: 'Interest & dividends',
  other: 'Other',
};

export const INVESTMENT_KIND_LABEL: Record<InvestmentKind, string> = {
  sip: 'SIP',
  mutual_fund: 'Mutual fund (lump sum)',
  stocks: 'Shares',
  fd: 'Fixed deposit',
  rd: 'Recurring deposit',
  ppf: 'PPF',
  epf: 'EPF / PF',
  nps: 'NPS',
  gold: 'Gold',
  savings: 'Savings account',
  other: 'Other',
};

export const INVESTMENT_STATUS_LABEL: Record<InvestmentStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  matured: 'Matured',
  closed: 'Closed',
};
