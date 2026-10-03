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

export interface FinanceData {
  members: Member[];
  liabilities: Liability[];
  installments: Installment[];
  expenses: Expense[];
  policies: Policy[];
}

export const EMPTY_DATA: FinanceData = {
  members: [],
  liabilities: [],
  installments: [],
  expenses: [],
  policies: [],
};

/** 'all' = whole household. */
export type MemberScope = 'all' | string;
