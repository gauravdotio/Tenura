import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { 
  Profile, 
  Liability, 
  EMISchedule, 
  ExpenseItem, 
  EMIScheduleMonth,
  DashboardSummary 
} from '../types/finance';
import { 
  initialProfiles, 
  initialLiabilities, 
  initialSchedules, 
  initialExpenses 
} from '../data/initialData';

interface FinanceContextType {
  selectedProfileId: string; // 'all' or profile id
  setSelectedProfileId: (id: string) => void;
  profiles: Profile[];
  addProfile: (profile: Omit<Profile, 'id'>) => void;
  
  liabilities: Liability[];
  addLiability: (item: Omit<Liability, 'id'>) => string;
  updateLiability: (id: string, updates: Partial<Liability>) => void;
  deleteLiability: (id: string) => void;
  convertToEmi: (liabilityId: string, emiAmount: number, tenure: number, startMonthDate: string) => void;
  
  schedules: EMISchedule[];
  toggleMonthPaid: (liabilityId: string, monthId: string) => void;
  addAmortizationSchedule: (schedule: EMISchedule) => void;
  
  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  deleteExpense: (id: string) => void;
  
  summary: DashboardSummary;
  filteredLiabilities: Liability[];
  filteredSchedules: EMISchedule[];
  filteredExpenses: ExpenseItem[];
  
  currencySymbol: string;
  triggerCelebration: () => void;
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILES: 'fintech_tracker_profiles_v1',
  LIABILITIES: 'fintech_tracker_liabilities_v1',
  SCHEDULES: 'fintech_tracker_schedules_v1',
  EXPENSES: 'fintech_tracker_expenses_v1',
  ACTIVE_PROFILE: 'fintech_tracker_active_profile_v1',
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE) || 'gaurav';
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return saved ? JSON.parse(saved) : initialProfiles;
  });

  const [liabilities, setLiabilities] = useState<Liability[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LIABILITIES);
    return saved ? JSON.parse(saved) : initialLiabilities;
  });

  const [schedules, setSchedules] = useState<EMISchedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return saved ? JSON.parse(saved) : initialSchedules;
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const currencySymbol = '₹';

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(liabilities));
  }, [liabilities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#6366F1', '#06B6D4', '#F59E0B']
    });
  };

  const addProfile = (profile: Omit<Profile, 'id'>) => {
    const newProfile: Profile = {
      ...profile,
      id: `profile-${Date.now()}`
    };
    setProfiles(prev => [...prev, newProfile]);
    setSelectedProfileId(newProfile.id);
  };

  const addLiability = (item: Omit<Liability, 'id'>): string => {
    const id = `liab-${Date.now()}`;
    const newLiability: Liability = { ...item, id };
    setLiabilities(prev => [newLiability, ...prev]);

    // If it's an EMI or has tenure & emiAmount, automatically generate schedule
    if (item.emiAmount && item.tenure) {
      generateAndAddSchedule(
        id, 
        item.providerName, 
        item.profileId, 
        item.totalAmount || (item.emiAmount * item.tenure), 
        item.emiAmount, 
        item.tenure, 
        item.startDate || new Date().toISOString().slice(0, 7)
      );
    }
    return id;
  };

  const updateLiability = (id: string, updates: Partial<Liability>) => {
    setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLiability = (id: string) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
    setSchedules(prev => prev.filter(s => s.liabilityId !== id));
  };

  const generateAndAddSchedule = (
    liabilityId: string, 
    title: string, 
    profileId: string, 
    totalAmount: number, 
    monthlyEmi: number, 
    tenure: number, 
    startMonthDate: string
  ) => {
    const months: EMIScheduleMonth[] = [];
    const [yearStr, monthStr] = (startMonthDate || '2026-09').split('-');
    let currentYear = parseInt(yearStr, 10) || 2026;
    let currentMonth = parseInt(monthStr, 10) || 9; // 1-12

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

    for (let i = 1; i <= tenure; i++) {
      const label = `${monthNames[currentMonth - 1]} ${currentYear}`;
      const isoMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      months.push({
        id: `m-${liabilityId}-${i}`,
        liabilityId,
        monthLabel: label,
        monthDate: isoMonth,
        installmentIndex: i,
        amount: monthlyEmi,
        isPaid: false,
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    const newSchedule: EMISchedule = {
      liabilityId,
      title,
      profileId,
      originalAmount: totalAmount,
      monthlyEmi,
      totalTenure: tenure,
      months,
    };

    setSchedules(prev => {
      const filtered = prev.filter(s => s.liabilityId !== liabilityId);
      return [...filtered, newSchedule];
    });
  };

  const addAmortizationSchedule = (schedule: EMISchedule) => {
    setSchedules(prev => [...prev.filter(s => s.liabilityId !== schedule.liabilityId), schedule]);
  };

  const convertToEmi = (liabilityId: string, emiAmount: number, tenure: number, startMonthDate: string) => {
    const liab = liabilities.find(l => l.id === liabilityId);
    if (!liab) return;

    const totalPayable = emiAmount * tenure;

    updateLiability(liabilityId, {
      status: 'converted_to_emi',
      statusNote: 'converted to emi',
      emiAmount,
      tenure,
      totalAmount: totalPayable,
      hasSchedule: true,
    });

    generateAndAddSchedule(
      liabilityId, 
      liab.providerName, 
      liab.profileId, 
      totalPayable, 
      emiAmount, 
      tenure, 
      startMonthDate
    );
  };

  const toggleMonthPaid = (liabilityId: string, monthId: string) => {
    setSchedules(prev => prev.map(sch => {
      if (sch.liabilityId !== liabilityId) return sch;

      let allPaid = true;
      const updatedMonths = sch.months.map(m => {
        if (m.id === monthId) {
          const newStatus = !m.isPaid;
          if (!newStatus) allPaid = false;
          return {
            ...m,
            isPaid: newStatus,
            paidDate: newStatus ? new Date().toISOString().slice(0, 10) : undefined,
          };
        }
        if (!m.isPaid) allPaid = false;
        return m;
      });

      // If all months are now paid, update liability status and trigger celebration
      if (allPaid && updatedMonths.length > 0) {
        updateLiability(liabilityId, { status: 'paid_off', statusNote: 'Fully Settled 🎉' });
        triggerCelebration();
      }

      return {
        ...sch,
        months: updatedMonths,
      };
    }));
  };

  const addExpense = (expense: Omit<ExpenseItem, 'id'>) => {
    const newExpense: ExpenseItem = {
      ...expense,
      id: `exp-${Date.now()}`
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Filtered dataset according to active profile
  const filteredLiabilities = liabilities.filter(l => 
    selectedProfileId === 'all' ? true : l.profileId === selectedProfileId
  );

  const filteredSchedules = schedules.filter(s => 
    selectedProfileId === 'all' ? true : s.profileId === selectedProfileId
  );

  const filteredExpenses = expenses.filter(e => 
    selectedProfileId === 'all' ? true : e.profileId === selectedProfileId
  );

  // Computations
  const totalLiabilitiesAmount = filteredLiabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  
  const totalMonthlyEmi = filteredLiabilities.reduce((sum, l) => {
    return l.status !== 'paid_off' && l.emiAmount ? sum + l.emiAmount : sum;
  }, 0);

  const totalEmiLeft = filteredSchedules.reduce((schSum, sch) => {
    const unpaidSum = sch.months
      .filter(m => !m.isPaid)
      .reduce((mSum, m) => mSum + m.amount, 0);
    return schSum + unpaidSum;
  }, 0);

  const activeEmiCount = filteredLiabilities.filter(l => l.status !== 'paid_off' && (l.type === 'emi' || l.status === 'converted_to_emi')).length;
  const creditCardDebt = filteredLiabilities
    .filter(l => l.type === 'credit_card' && l.status === 'active')
    .reduce((sum, l) => sum + l.amount, 0);
  const loansCount = filteredLiabilities.filter(l => l.status !== 'paid_off').length;
  const paidOffCount = filteredLiabilities.filter(l => l.status === 'paid_off').length;

  const summary: DashboardSummary = {
    totalLiabilitiesAmount,
    totalMonthlyEmi,
    totalEmiLeft,
    activeEmiCount,
    creditCardDebt,
    loansCount,
    paidOffCount,
  };

  const exportDataJSON = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profiles,
      liabilities,
      schedules,
      expenses,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `finance_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDataJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.liabilities && data.schedules) {
        if (data.profiles) setProfiles(data.profiles);
        setLiabilities(data.liabilities);
        setSchedules(data.schedules);
        if (data.expenses) setExpenses(data.expenses);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  const resetToDefaultData = () => {
    setProfiles(initialProfiles);
    setLiabilities(initialLiabilities);
    setSchedules(initialSchedules);
    setExpenses(initialExpenses);
    setSelectedProfileId('gaurav');
  };

  return (
    <FinanceContext.Provider value={{
      selectedProfileId,
      setSelectedProfileId,
      profiles,
      addProfile,
      liabilities,
      addLiability,
      updateLiability,
      deleteLiability,
      convertToEmi,
      schedules,
      toggleMonthPaid,
      addAmortizationSchedule,
      expenses,
      addExpense,
      deleteExpense,
      summary,
      filteredLiabilities,
      filteredSchedules,
      filteredExpenses,
      currencySymbol,
      triggerCelebration,
      exportDataJSON,
      importDataJSON,
      resetToDefaultData,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
