/** Domain model shared by the UI, the local store and the Supabase store. */

export type MemberColor = 'blue' | 'teal' | 'violet' | 'amber' | 'rose' | 'slate';

export interface Member {
  id: string;
  name: string;
  /** "Self", "Spouse", "Parent", ... */
  relation: string;
  color: MemberColor;
  monthlyBudget: number;
  /** The account holder. Exactly one per household; can't be removed. */
  isPrimary: boolean;
  /** Contact details, used for invites and (later) WhatsApp reminders. */
  email?: string;
  phone?: string;
  /** Cloud only, read-only in the app: set when the member has accepted an invite. */
  linkedUserId?: string;
  inviteCode?: string;
  inviteExpiresAt?: string;
}

export type LiabilityKind = 'credit_card' | 'loan' | 'emi' | 'bnpl';

export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners';

/**
 * - active:    being repaid (card balance, loan, EMI plan)
 * - converted: a card balance that was converted into an EMI plan
 * - closed:    fully settled
 */
export type LiabilityStatus = 'active' | 'converted' | 'closed';

export interface Liability {
  id: string;
  memberId: string;
  provider: string;
  kind: LiabilityKind;
  status: LiabilityStatus;
  /** Principal borrowed, or the current card balance. */
  balance: number;
  /** Annual interest rate in percent (reducing balance). 0 = no-cost EMI. */
  interestRate?: number;
  emiAmount?: number;
  tenureMonths?: number;
  /** First installment month, YYYY-MM. */
  startMonth?: string;
  /** Credit cards: day of the month the bill is due. */
  dueDay?: number;
  cardLast4?: string;
  /** Credit cards: total credit limit. */
  creditLimit?: number;
  cardNetwork?: CardNetwork;
  notes?: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  liabilityId: string;
  /** 1-based position in the plan. */
  seq: number;
  /** YYYY-MM */
  dueMonth: string;
  amount: number;
  /** YYYY-MM-DD when paid, undefined while outstanding. */
  paidOn?: string;
}

export type ExpenseCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'dining'
  | 'shopping'
  | 'transport'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'other';

export interface Expense {
  id: string;
  memberId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  /** YYYY-MM-DD */
  date: string;
  paymentMethod: string;
  isRecurring: boolean;
  notes?: string;
}

export type PremiumFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type PolicyStatus = 'active' | 'lapsed' | 'matured';

export interface Policy {
  id: string;
  memberId: string;
  provider: string;
  name: string;
  policyNumber?: string;
  premium: number;
  frequency: PremiumFrequency;
  sumAssured: number;
  /** YYYY-MM-DD */
  nextDueDate?: string;
  /** YYYY-MM-DD */
  maturityDate?: string;
  status: PolicyStatus;
  notes?: string;
}

export type IncomeKind = 'salary' | 'business' | 'freelance' | 'rental' | 'pension' | 'interest' | 'other';

export interface Income {
  id: string;
  memberId: string;
  kind: IncomeKind;
  /** Employer, business or tenant — "Infosys", "Shop", "Flat 2B rent". */
  source: string;
  /** Take-home amount per payment, after tax. */
  amount: number;
  frequency: PremiumFrequency;
  isActive: boolean;
  notes?: string;
}

export type InvestmentKind = 'sip' | 'mutual_fund' | 'stocks' | 'fd' | 'rd' | 'ppf' | 'epf' | 'nps' | 'gold' | 'savings' | 'other';
export type InvestmentStatus = 'active' | 'paused' | 'matured' | 'closed';

export interface Investment {
  id: string;
  memberId: string;
  kind: InvestmentKind;
  /** Bank, AMC, broker or scheme — "SBI", "Parag Parikh", "Zerodha". */
  provider: string;
  name: string;
  /** Recurring amount (SIP, RD, PPF, NPS, EPF), paid every `frequency`. */
  contribution?: number;
  frequency?: PremiumFrequency;
  /** Total put in so far. For recurring plans it can be left out and is estimated from the start date. */
  invested: number;
  /** Latest value, if the user knows it (market-linked investments). */
  currentValue?: number;
  /** Annual rate in percent: FD/RD/PPF interest, or expected return. */
  interestRate?: number;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  maturityDate?: string;
  /** Kept aside for emergencies — the planner won't suggest using it to repay debt. */
  emergencyFund: boolean;
  status: InvestmentStatus;
  notes?: string;
}

export interface FinanceData {
  members: Member[];
  liabilities: Liability[];
  installments: Installment[];
  expenses: Expense[];
  policies: Policy[];
  incomes: Income[];
  investments: Investment[];
}

export const EMPTY_DATA: FinanceData = {
  members: [],
  liabilities: [],
  installments: [],
  expenses: [],
  policies: [],
  incomes: [],
  investments: [],
};

/** 'all' = whole household. */
export type MemberScope = 'all' | string;
