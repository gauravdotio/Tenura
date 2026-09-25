export type LiabilityType = 'credit_card' | 'loan' | 'emi' | 'bnpl';
export type LiabilityStatus = 'active' | 'converted_to_emi' | 'paid_off' | 'overdue';

export interface Profile {
  id: string;
  name: string;
  initials: string;
  role: string;
  accentColor: string;
  monthlyBudget?: number;
}

export interface EMIScheduleMonth {
  id: string;
  liabilityId?: string;
  monthLabel: string;
  monthDate: string; // YYYY-MM
  installmentIndex: number;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
}

export interface EMISchedule {
  liabilityId: string;
  title: string;
  profileId: string;
  originalAmount: number;
  monthlyEmi: number;
  totalTenure: number;
  months: EMIScheduleMonth[];
}

export interface Liability {
  id: string;
  profileId: string;
  providerName: string;
  type: LiabilityType;
  amount: number; // Current principal / balance
  status: LiabilityStatus;
  statusNote?: string;
  emiAmount?: number;
  tenure?: number;
  totalAmount?: number; // Total with interest or total tenure sum
  startDate?: string;
  hasSchedule?: boolean;
  cardLast4?: string;
  apr?: number;
  category?: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'housing'
  | 'utilities'
  | 'food_groceries'
  | 'shopping'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'debt_emi'
  | 'other';

export interface ExpenseItem {
  id: string;
  profileId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  isRecurring?: boolean;
  notes?: string;
}

// Extensible for future LIC & Life Insurance policies
export interface InsurancePolicy {
  id: string;
  profileId: string;
  providerName: string; // e.g. 'LIC', 'HDFC Life', 'SBI Life'
  policyName: string;   // e.g. 'LIC Jeevan Labh', 'Term Insurance'
  policyNumber?: string;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  sumAssured: number;
  maturityDate?: string;
  nextPremiumDate?: string;
  status: 'active' | 'lapsed' | 'matured';
  notes?: string;
}

export interface DashboardSummary {
  totalLiabilitiesAmount: number; // Red: Total active debt
  totalMonthlyEmi: number;        // Blue: Active monthly EMI commitments
  totalEmiLeft: number;           // Remaining to be paid on EMIs
  activeEmiCount: number;         // Count of active EMI schedules
  creditCardDebt: number;         // Red: Revolving credit cards
  loansCount: number;             // Count of active loan instruments
  paidOffCount: number;           // Fully settled records
  totalWealthCleared: number;     // Green: Cleared wealth & debt settled
}
