import type { Profile, Liability, EMISchedule, ExpenseItem } from './finance';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  pin?: string;
  avatarColor: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserFinanceData {
  profiles: Profile[];
  liabilities: Liability[];
  schedules: EMISchedule[];
  expenses: ExpenseItem[];
  selectedProfileId: string;
}

export interface AuthContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  isCloudConnected: boolean;
  cloudProvider: 'supabase' | 'local';
  isLoading: boolean;
  login: (userIdOrEmail: string, pinOrPassword?: string) => Promise<{ success: boolean; error?: string }>;
  instantLogin: (user: UserAccount) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; pin?: string; startEmpty?: boolean }) => Promise<{ success: boolean; user?: UserAccount; error?: string }>;
  logout: () => Promise<void>;
  deleteUser: (userId: string) => void;
  updateUserPin: (userId: string, newPin?: string) => void;
}
