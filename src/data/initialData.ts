import type { Profile, Liability, EMISchedule, ExpenseItem } from '../types/finance';

export const initialProfiles: Profile[] = [
  {
    id: 'gaurav',
    name: 'Gaurav',
    initials: 'GR',
    role: 'Primary Account',
    accentColor: '#6366F1',
    monthlyBudget: 75000,
  },
  {
    id: 'didi',
    name: 'Didi',
    initials: 'DR',
    role: 'Secondary Account',
    accentColor: '#06B6D4',
    monthlyBudget: 60000,
  }
];

export const initialLiabilities: Liability[] = [
  {
    id: 'liab-1',
    profileId: 'gaurav',
    providerName: 'IndusInd Bank CC',
    type: 'credit_card',
    amount: 30000,
    status: 'active',
    statusNote: 'Active Card Balance',
    notes: 'Primary shopping & reward card',
  },
  {
    id: 'liab-2',
    profileId: 'gaurav',
    providerName: 'SBI Card',
    type: 'credit_card',
    amount: 26000,
    status: 'active',
    statusNote: 'Active Card Balance',
    notes: 'Fuel & Utility spends',
  },
  {
    id: 'liab-3',
    profileId: 'gaurav',
    providerName: 'IDFC FIRST Bank CC',
    type: 'credit_card',
    amount: 25000,
    status: 'converted_to_emi',
    statusNote: 'converted to emi',
    emiAmount: 2880,
    tenure: 9,
    totalAmount: 25920,
    hasSchedule: true,
    notes: 'Converted to 9-month installment plan',
  },
  {
    id: 'liab-4',
    profileId: 'gaurav',
    providerName: 'RBL Bank CC',
    type: 'credit_card',
    amount: 25000,
    status: 'active',
    statusNote: 'Active Card Balance',
    notes: 'Travel & Dining card',
  },
  {
    id: 'liab-5',
    profileId: 'gaurav',
    providerName: 'AC Consumer EMI',
    type: 'emi',
    amount: 27972,
    status: 'active',
    statusNote: 'Active Consumer EMI',
    emiAmount: 2331,
    tenure: 12,
    totalAmount: 27972,
    hasSchedule: true,
    notes: '1.5 Ton Inverter AC purchase',
  },
  // Didi's profile liabilities
  {
    id: 'liab-d1',
    profileId: 'didi',
    providerName: 'HDFC Regalia CC',
    type: 'credit_card',
    amount: 18500,
    status: 'active',
    statusNote: 'Active Card Balance',
    notes: 'Monthly groceries & lifestyle',
  },
  {
    id: 'liab-d2',
    profileId: 'didi',
    providerName: 'MacBook Air EMI',
    type: 'emi',
    amount: 54000,
    status: 'active',
    statusNote: '6-Month No Cost EMI',
    emiAmount: 9000,
    tenure: 6,
    totalAmount: 54000,
    hasSchedule: true,
    notes: 'MacBook Air M2',
  }
];

export const initialSchedules: EMISchedule[] = [
  {
    liabilityId: 'liab-5', // AC EMI
    title: 'AC Consumer EMI',
    profileId: 'gaurav',
    originalAmount: 27972,
    monthlyEmi: 2331,
    totalTenure: 12,
    months: [
      { id: 'm-ac-1', liabilityId: 'liab-5', monthLabel: 'Aug 2026', monthDate: '2026-08', installmentIndex: 1, amount: 2331, isPaid: true, paidDate: '2026-08-05' },
      { id: 'm-ac-2', liabilityId: 'liab-5', monthLabel: 'Sept 2026', monthDate: '2026-09', installmentIndex: 2, amount: 2331, isPaid: false },
      { id: 'm-ac-3', liabilityId: 'liab-5', monthLabel: 'Oct 2026', monthDate: '2026-10', installmentIndex: 3, amount: 2331, isPaid: false },
      { id: 'm-ac-4', liabilityId: 'liab-5', monthLabel: 'Nov 2026', monthDate: '2026-11', installmentIndex: 4, amount: 2331, isPaid: false },
      { id: 'm-ac-5', liabilityId: 'liab-5', monthLabel: 'Dec 2026', monthDate: '2026-12', installmentIndex: 5, amount: 2331, isPaid: false },
      { id: 'm-ac-6', liabilityId: 'liab-5', monthLabel: 'Jan 2027', monthDate: '2027-01', installmentIndex: 6, amount: 2331, isPaid: false },
      { id: 'm-ac-7', liabilityId: 'liab-5', monthLabel: 'Feb 2027', monthDate: '2027-02', installmentIndex: 7, amount: 2331, isPaid: false },
      { id: 'm-ac-8', liabilityId: 'liab-5', monthLabel: 'Mar 2027', monthDate: '2027-03', installmentIndex: 8, amount: 2331, isPaid: false },
      { id: 'm-ac-9', liabilityId: 'liab-5', monthLabel: 'Apr 2027', monthDate: '2027-04', installmentIndex: 9, amount: 2331, isPaid: false },
      { id: 'm-ac-10', liabilityId: 'liab-5', monthLabel: 'May 2027', monthDate: '2027-05', installmentIndex: 10, amount: 2331, isPaid: false },
      { id: 'm-ac-11', liabilityId: 'liab-5', monthLabel: 'Jun 2027', monthDate: '2027-06', installmentIndex: 11, amount: 2331, isPaid: false },
      { id: 'm-ac-12', liabilityId: 'liab-5', monthLabel: 'Jul 2027', monthDate: '2027-07', installmentIndex: 12, amount: 2331, isPaid: false },
    ]
  },
  {
    liabilityId: 'liab-3', // IDFC CC EMI
    title: 'IDFC FIRST Bank CC EMI',
    profileId: 'gaurav',
    originalAmount: 25920,
    monthlyEmi: 2880,
    totalTenure: 9,
    months: [
      { id: 'm-idfc-1', liabilityId: 'liab-3', monthLabel: 'Oct 2026', monthDate: '2026-10', installmentIndex: 1, amount: 2880, isPaid: false },
      { id: 'm-idfc-2', liabilityId: 'liab-3', monthLabel: 'Nov 2026', monthDate: '2026-11', installmentIndex: 2, amount: 2880, isPaid: false },
      { id: 'm-idfc-3', liabilityId: 'liab-3', monthLabel: 'Dec 2026', monthDate: '2026-12', installmentIndex: 3, amount: 2880, isPaid: false },
      { id: 'm-idfc-4', liabilityId: 'liab-3', monthLabel: 'Jan 2027', monthDate: '2027-01', installmentIndex: 4, amount: 2880, isPaid: false },
      { id: 'm-idfc-5', liabilityId: 'liab-3', monthLabel: 'Feb 2027', monthDate: '2027-02', installmentIndex: 5, amount: 2880, isPaid: false },
      { id: 'm-idfc-6', liabilityId: 'liab-3', monthLabel: 'Mar 2027', monthDate: '2027-03', installmentIndex: 6, amount: 2880, isPaid: false },
      { id: 'm-idfc-7', liabilityId: 'liab-3', monthLabel: 'Apr 2027', monthDate: '2027-04', installmentIndex: 7, amount: 2880, isPaid: false },
      { id: 'm-idfc-8', liabilityId: 'liab-3', monthLabel: 'May 2027', monthDate: '2027-05', installmentIndex: 8, amount: 2880, isPaid: false },
      { id: 'm-idfc-9', liabilityId: 'liab-3', monthLabel: 'Jun 2027', monthDate: '2027-06', installmentIndex: 9, amount: 2880, isPaid: false },
    ]
  },
  {
    liabilityId: 'liab-d2',
    title: 'MacBook Air EMI',
    profileId: 'didi',
    originalAmount: 54000,
    monthlyEmi: 9000,
    totalTenure: 6,
    months: [
      { id: 'm-d2-1', liabilityId: 'liab-d2', monthLabel: 'Jul 2026', monthDate: '2026-07', installmentIndex: 1, amount: 9000, isPaid: true, paidDate: '2026-07-02' },
      { id: 'm-d2-2', liabilityId: 'liab-d2', monthLabel: 'Aug 2026', monthDate: '2026-08', installmentIndex: 2, amount: 9000, isPaid: true, paidDate: '2026-08-02' },
      { id: 'm-d2-3', liabilityId: 'liab-d2', monthLabel: 'Sept 2026', monthDate: '2026-09', installmentIndex: 3, amount: 9000, isPaid: false },
      { id: 'm-d2-4', liabilityId: 'liab-d2', monthLabel: 'Oct 2026', monthDate: '2026-10', installmentIndex: 4, amount: 9000, isPaid: false },
      { id: 'm-d2-5', liabilityId: 'liab-d2', monthLabel: 'Nov 2026', monthDate: '2026-11', installmentIndex: 5, amount: 9000, isPaid: false },
      { id: 'm-d2-6', liabilityId: 'liab-d2', monthLabel: 'Dec 2026', monthDate: '2026-12', installmentIndex: 6, amount: 9000, isPaid: false },
    ]
  }
];

export const initialExpenses: ExpenseItem[] = [
  {
    id: 'exp-1',
    profileId: 'gaurav',
    title: 'Electricity & Power Utilities',
    amount: 3200,
    category: 'utilities',
    date: '2026-08-28',
    paymentMethod: 'UPI',
    isRecurring: true,
  },
  {
    id: 'exp-2',
    profileId: 'gaurav',
    title: 'Essential Groceries & Supplies',
    amount: 4500,
    category: 'food_groceries',
    date: '2026-08-30',
    paymentMethod: 'Credit Card',
  },
  {
    id: 'exp-3',
    profileId: 'gaurav',
    title: 'Fiber Internet Subscription',
    amount: 999,
    category: 'utilities',
    date: '2026-09-01',
    paymentMethod: 'UPI',
    isRecurring: true,
  },
  {
    id: 'exp-4',
    profileId: 'gaurav',
    title: 'Automotive Fuel Expense',
    amount: 2500,
    category: 'transport',
    date: '2026-09-01',
    paymentMethod: 'Credit Card',
  }
];
