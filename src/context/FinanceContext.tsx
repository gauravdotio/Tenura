import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { 
  Profile, 
  Liability, 
  EMISchedule, 
  ExpenseItem, 
  EMIScheduleMonth,
  DashboardSummary 
} from '../types/finance';
import type { UserFinanceData, UserAccount } from '../types/auth';
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
  addProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  
  liabilities: Liability[];
  addLiability: (item: Omit<Liability, 'id'>) => Promise<string>;
  updateLiability: (id: string, updates: Partial<Liability>) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;
  convertToEmi: (liabilityId: string, emiAmount: number, tenure: number, startMonthDate: string) => Promise<void>;
  
  schedules: EMISchedule[];
  toggleMonthPaid: (liabilityId: string, monthId: string) => Promise<void>;
  addAmortizationSchedule: (schedule: EMISchedule) => Promise<void>;
  
  expenses: ExpenseItem[];
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  summary: DashboardSummary;
  filteredLiabilities: Liability[];
  filteredSchedules: EMISchedule[];
  filteredExpenses: ExpenseItem[];
  
  currencySymbol: string;
  triggerCelebration: () => void;
  exportDataJSON: () => void;
  importDataJSON: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  clearVaultData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

function consolidateProfilesAndLiabilities(
  rawProfiles: Profile[],
  rawLiabilities: Liability[],
  rawSchedules: EMISchedule[]
): {
  profiles: Profile[];
  liabilities: Liability[];
  schedules: EMISchedule[];
} {
  if (!rawProfiles || rawProfiles.length <= 1) {
    return {
      profiles: rawProfiles || [],
      liabilities: rawLiabilities || [],
      schedules: rawSchedules || []
    };
  }

  const profilesByName = new Map<string, Profile[]>();
  for (const p of rawProfiles) {
    const key = p.name.trim().toLowerCase();
    if (!profilesByName.has(key)) {
      profilesByName.set(key, []);
    }
    profilesByName.get(key)!.push(p);
  }

  const consolidatedProfiles: Profile[] = [];
  const profileIdRedirects = new Map<string, string>(); // oldId -> canonicalId

  for (const [_, list] of profilesByName.entries()) {
    if (list.length === 1) {
      consolidatedProfiles.push(list[0]);
    } else {
      // Find the profile that already has liabilities, or default to the first one
      let canonical = list[0];
      for (const p of list) {
        const hasLiab = rawLiabilities.some(l => l.profileId === p.id);
        if (hasLiab) {
          canonical = p;
          break;
        }
      }
      consolidatedProfiles.push(canonical);
      for (const p of list) {
        if (p.id !== canonical.id) {
          profileIdRedirects.set(p.id, canonical.id);
        }
      }
    }
  }

  // Remap liabilities and schedules from duplicate profiles to canonical profile
  const updatedLiabilities = rawLiabilities.map(l => {
    if (profileIdRedirects.has(l.profileId)) {
      return { ...l, profileId: profileIdRedirects.get(l.profileId)! };
    }
    return l;
  });

  const updatedSchedules = rawSchedules.map(s => {
    if (profileIdRedirects.has(s.profileId)) {
      return { ...s, profileId: profileIdRedirects.get(s.profileId)! };
    }
    return s;
  });

  return {
    profiles: consolidatedProfiles,
    liabilities: updatedLiabilities,
    schedules: updatedSchedules,
  };
}

function loadLocalUserData(user: UserAccount | null): UserFinanceData {
  if (!user) {
    return {
      profiles: [],
      liabilities: [],
      schedules: [],
      expenses: [],
      selectedProfileId: 'all',
    };
  }

  // 1. Try multiple redundant keys to ensure data is never lost across sessions
  const keysToTry = [
    `tenura_vault_${user.id}`,
    user.email ? `tenura_backup_${user.email.toLowerCase()}` : null,
    user.name ? `tenura_backup_${user.name.toLowerCase().replace(/\s+/g, '_')}` : null,
    'tenura_last_active_vault',
  ].filter(Boolean) as string[];

  for (const k of keysToTry) {
    try {
      const saved = localStorage.getItem(k);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.profiles) && (parsed.liabilities?.length > 0 || parsed.profiles?.length > 0)) {
          const consolidated = consolidateProfilesAndLiabilities(
            parsed.profiles || [],
            parsed.liabilities || [],
            parsed.schedules || []
          );
          return {
            profiles: consolidated.profiles,
            liabilities: consolidated.liabilities,
            schedules: consolidated.schedules,
            expenses: parsed.expenses || [],
            selectedProfileId: parsed.selectedProfileId || 'all',
          };
        }
      }
    } catch (e) {
      console.warn(`Error reading vault key ${k}:`, e);
    }
  }

  // Pre-seeded for Gaurav demo or any account named Gaurav Rawat
  if (user.id === 'user_gaurav' || user.name.toLowerCase().includes('gaurav')) {
    return {
      profiles: initialProfiles,
      liabilities: initialLiabilities,
      schedules: initialSchedules,
      expenses: initialExpenses,
      selectedProfileId: 'gaurav',
    };
  }

  // Pre-seeded for DeeDee demo
  if (user.id === 'user_deedee') {
    return {
      profiles: [
        {
          id: 'didi',
          name: 'DeeDee',
          initials: 'DD',
          role: 'Primary Account',
          accentColor: '#06B6D4',
          monthlyBudget: 60000,
        }
      ],
      liabilities: initialLiabilities.filter(l => l.profileId === 'didi'),
      schedules: initialSchedules.filter(s => s.profileId === 'didi'),
      expenses: [],
      selectedProfileId: 'didi',
    };
  }

  // Default for all other users: start with empty slate
  const initials = user.name
    .split(' ')
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'U';

  const defaultProfileId = `profile_${user.id}`;

  return {
    profiles: [
      {
        id: defaultProfileId,
        name: user.name,
        initials,
        role: 'Primary Account',
        accentColor: '#6366F1',
        monthlyBudget: 75000,
      }
    ],
    liabilities: [],
    schedules: [],
    expenses: [],
    selectedProfileId: defaultProfileId,
  };
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isCloudConnected } = useAuth();

  const isInitialLoadDoneRef = useRef(false);

  // Synchronously initialize state from local vault so state is NEVER empty on initial render
  const initialData = useMemo(() => {
    if (!currentUser) return null;
    const raw = loadLocalUserData(currentUser);
    const consolidated = consolidateProfilesAndLiabilities(raw.profiles, raw.liabilities, raw.schedules);
    return {
      ...raw,
      profiles: consolidated.profiles,
      liabilities: consolidated.liabilities,
      schedules: consolidated.schedules,
    };
  }, [currentUser?.id]);

  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => initialData?.selectedProfileId || 'all');
  const [profiles, setProfiles] = useState<Profile[]>(() => initialData?.profiles || []);
  const [liabilities, setLiabilities] = useState<Liability[]>(() => initialData?.liabilities || []);
  const [schedules, setSchedules] = useState<EMISchedule[]>(() => initialData?.schedules || []);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => initialData?.expenses || []);

  const currencySymbol = '₹';

  // Load data whenever currentUser changes or cloud state changes
  useEffect(() => {
    if (!currentUser) {
      isInitialLoadDoneRef.current = false;
      return;
    }

    // Immediately restore from local vault
    const local = loadLocalUserData(currentUser);
    const consolidatedLocal = consolidateProfilesAndLiabilities(
      local.profiles,
      local.liabilities,
      local.schedules
    );
    if (consolidatedLocal.profiles.length > 0 || consolidatedLocal.liabilities.length > 0) {
      setProfiles(consolidatedLocal.profiles);
      setLiabilities(consolidatedLocal.liabilities);
      setSchedules(consolidatedLocal.schedules);
      setExpenses(local.expenses);
      setSelectedProfileId(prev => {
        if (prev === 'all') return 'all';
        if (consolidatedLocal.profiles.some(p => p.id === prev)) return prev;
        return consolidatedLocal.profiles[0]?.id || 'all';
      });
    }

    if (isCloudConnected) {
      const fetchSupabaseData = async () => {
        try {
          const userFilter = `user_id.eq.${currentUser.id}${currentUser.email ? `,user_id.eq.${currentUser.email}` : ''}`;

          const [profilesRes, liabRes, schedRes, expRes] = await Promise.all([
            supabase.from('profiles').select('*').or(userFilter).order('created_at', { ascending: true }),
            supabase.from('liabilities').select('*').or(userFilter).order('created_at', { ascending: false }),
            supabase.from('emi_schedules').select('*').or(userFilter),
            supabase.from('expenses').select('*').or(userFilter).order('date', { ascending: false }),
          ]);

          const dbProfiles: Profile[] = (profilesRes.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            initials: p.initials,
            role: p.role,
            accentColor: p.accent_color,
            monthlyBudget: Number(p.monthly_budget),
          }));

          const dbLiabilities: Liability[] = (liabRes.data || []).map((l: any) => ({
            id: l.id,
            profileId: l.profile_id,
            providerName: l.provider_name,
            type: l.type,
            amount: Number(l.amount),
            status: l.status,
            statusNote: l.status_note,
            emiAmount: l.emi_amount ? Number(l.emi_amount) : undefined,
            tenure: l.tenure ? Number(l.tenure) : undefined,
            totalAmount: l.total_amount ? Number(l.total_amount) : undefined,
            startDate: l.start_date,
            hasSchedule: Boolean(l.has_schedule),
            notes: l.notes,
          }));

          const dbSchedules: EMISchedule[] = (schedRes.data || []).map((s: any) => ({
            liabilityId: s.liability_id,
            title: s.title,
            profileId: s.profile_id,
            originalAmount: Number(s.original_amount),
            monthlyEmi: Number(s.monthly_emi),
            totalTenure: Number(s.total_tenure),
            months: Array.isArray(s.months) ? s.months : [],
          }));

          const dbExpenses: ExpenseItem[] = (expRes.data || []).map((e: any) => ({
            id: e.id,
            profileId: e.profile_id,
            title: e.title,
            amount: Number(e.amount),
            category: e.category,
            date: e.date,
            paymentMethod: e.payment_method,
            isRecurring: Boolean(e.is_recurring),
          }));

          // If Supabase returned data, consolidate and use it
          if (dbLiabilities.length > 0) {
            const consolidated = consolidateProfilesAndLiabilities(
              dbProfiles.length > 0 ? dbProfiles : local.profiles,
              dbLiabilities,
              dbSchedules
            );
            setLiabilities(consolidated.liabilities);
            setSchedules(consolidated.schedules);
            setExpenses(dbExpenses);
            setProfiles(consolidated.profiles);
            setSelectedProfileId(prev => {
              if (prev === 'all') return 'all';
              if (consolidated.profiles.some(p => p.id === prev)) return prev;
              return consolidated.profiles[0]?.id || 'all';
            });
          } else if (local.liabilities.length > 0) {
            // Local vault has liabilities but Supabase was empty: Auto-sync up to Supabase!
            console.log('Synchronizing local vault to Supabase...');
            for (const liab of local.liabilities) {
              await supabase.from('liabilities').upsert([{
                id: liab.id,
                user_id: currentUser.id,
                profile_id: liab.profileId,
                provider_name: liab.providerName,
                type: liab.type,
                amount: liab.amount,
                status: liab.status,
                status_note: liab.statusNote,
                emi_amount: liab.emiAmount,
                tenure: liab.tenure,
                total_amount: liab.totalAmount,
                start_date: liab.startDate,
                has_schedule: liab.hasSchedule,
                notes: liab.notes,
              }]);
            }
            for (const prof of local.profiles) {
              await supabase.from('profiles').upsert([{
                id: prof.id,
                user_id: currentUser.id,
                name: prof.name,
                initials: prof.initials,
                role: prof.role,
                accent_color: prof.accentColor,
                monthly_budget: prof.monthlyBudget,
              }]);
            }
            for (const sched of local.schedules) {
              await supabase.from('emi_schedules').upsert([{
                liability_id: sched.liabilityId,
                user_id: currentUser.id,
                profile_id: sched.profileId,
                title: sched.title,
                original_amount: sched.originalAmount,
                monthly_emi: sched.monthlyEmi,
                total_tenure: sched.totalTenure,
                months: sched.months,
              }]);
            }
          }
        } catch (err) {
          console.error('Supabase fetch error, using local vault:', err);
        } finally {
          isInitialLoadDoneRef.current = true;
        }
      };

      fetchSupabaseData();
    } else {
      isInitialLoadDoneRef.current = true;
    }
  }, [currentUser?.id, isCloudConnected]);

  // Universal Auto-Save: Always keep local vault up to date for instant persistence
  // Never overwrites until initial load is completely finished!
  useEffect(() => {
    if (!currentUser || !isInitialLoadDoneRef.current) return;

    const key = `tenura_vault_${currentUser.id}`;
    const payload: UserFinanceData = {
      profiles,
      liabilities,
      schedules,
      expenses,
      selectedProfileId,
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      if (currentUser.email) {
        localStorage.setItem(`tenura_backup_${currentUser.email.toLowerCase()}`, JSON.stringify(payload));
      }
      localStorage.setItem('tenura_last_active_vault', JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to auto-save vault:', e);
    }
  }, [currentUser, profiles, liabilities, schedules, expenses, selectedProfileId]);

  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10B981', '#6366F1', '#06B6D4', '#F59E0B'],
        disableForReducedMotion: true,
      });
    } catch {}
  }, []);

  const addProfile = useCallback(async (profile: Omit<Profile, 'id'>) => {
    const existing = profiles.find(p => p.name.trim().toLowerCase() === profile.name.trim().toLowerCase());
    if (existing) {
      setSelectedProfileId(existing.id);
      return;
    }

    const id = `profile-${Date.now()}`;
    const newProfile: Profile = { ...profile, id };

    setProfiles(prev => [...prev, newProfile]);
    setSelectedProfileId(id);

    if (isCloudConnected && currentUser) {
      const { error } = await supabase.from('profiles').upsert([{
        id,
        user_id: currentUser.id,
        name: profile.name,
        initials: profile.initials,
        role: profile.role,
        accent_color: profile.accentColor,
        monthly_budget: profile.monthlyBudget || 75000,
      }]);
      if (error) {
        console.error('Error saving profile to Supabase:', error);
      }
    }
  }, [profiles, isCloudConnected, currentUser]);

  const deleteProfile = useCallback(async (profileId: string) => {
    if (profiles.length <= 1) {
      alert("You cannot delete your only primary profile.");
      return;
    }

    const remainingProfiles = profiles.filter(p => p.id !== profileId);
    const primaryId = remainingProfiles[0]?.id || 'all';

    // Safely reassign any liabilities and schedules to primary profile
    setLiabilities(prev => prev.map(l => l.profileId === profileId ? { ...l, profileId: primaryId } : l));
    setSchedules(prev => prev.map(s => s.profileId === profileId ? { ...s, profileId: primaryId } : s));
    setProfiles(remainingProfiles);

    if (selectedProfileId === profileId) {
      setSelectedProfileId(primaryId);
    }

    if (isCloudConnected && currentUser) {
      try {
        await supabase.from('profiles').delete().eq('id', profileId);
        await supabase.from('liabilities').update({ profile_id: primaryId }).eq('profile_id', profileId);
        await supabase.from('emi_schedules').update({ profile_id: primaryId }).eq('profile_id', profileId);
      } catch (err) {
        console.error('Error deleting profile from Supabase:', err);
      }
    }
  }, [profiles, selectedProfileId, isCloudConnected, currentUser]);

  const generateAndAddSchedule = useCallback(async (
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
    let currentMonth = parseInt(monthStr, 10) || 9;

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

    if (isCloudConnected && currentUser) {
      const { error } = await supabase.from('emi_schedules').upsert([{
        liability_id: liabilityId,
        user_id: currentUser.id,
        profile_id: profileId,
        title,
        original_amount: totalAmount,
        monthly_emi: monthlyEmi,
        total_tenure: tenure,
        months,
      }]);
      if (error) {
        console.error('Error saving emi schedule to Supabase:', error);
      }
    }
  }, [isCloudConnected, currentUser]);

  const addLiability = useCallback(async (item: Omit<Liability, 'id'>): Promise<string> => {
    const id = `liab-${Date.now()}`;
    const newLiability: Liability = { ...item, id };
    setLiabilities(prev => [newLiability, ...prev]);

    if (isCloudConnected && currentUser) {
      const { error } = await supabase.from('liabilities').upsert([{
        id,
        user_id: currentUser.id,
        profile_id: item.profileId,
        provider_name: item.providerName,
        type: item.type,
        amount: item.amount,
        status: item.status,
        status_note: item.statusNote,
        emi_amount: item.emiAmount,
        tenure: item.tenure,
        total_amount: item.totalAmount || (item.emiAmount && item.tenure ? item.emiAmount * item.tenure : undefined),
        start_date: item.startDate,
        has_schedule: Boolean(item.emiAmount && item.tenure),
        notes: item.notes,
      }]);
      if (error) {
        console.error('Error inserting liability to Supabase:', error);
      }
    }

    if (item.emiAmount && item.tenure) {
      await generateAndAddSchedule(
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
  }, [generateAndAddSchedule, isCloudConnected, currentUser]);

  const updateLiability = useCallback(async (id: string, updates: Partial<Liability>) => {
    let targetLiab: Liability | undefined;
    setLiabilities(prev => prev.map(l => {
      if (l.id === id) {
        targetLiab = { ...l, ...updates };
        return targetLiab;
      }
      return l;
    }));

    // Sync amortization schedule if schedule parameters are provided
    const liab = targetLiab || liabilities.find(l => l.id === id);
    if (liab) {
      const merged = { ...liab, ...updates };
      const hasEmiParams = (merged.type === 'emi' || merged.type === 'bnpl' || merged.status === 'converted_to_emi') &&
        merged.emiAmount && merged.tenure && merged.emiAmount > 0 && merged.tenure > 0;

      if (hasEmiParams) {
        const totalPayable = merged.totalAmount || (merged.emiAmount! * merged.tenure!);
        await generateAndAddSchedule(
          merged.id,
          merged.providerName,
          merged.profileId,
          totalPayable,
          merged.emiAmount!,
          merged.tenure!,
          merged.startDate || new Date().toISOString().slice(0, 7)
        );
      } else if (merged.type === 'credit_card' && merged.status !== 'converted_to_emi') {
        // If switched to standard card without schedule, clean up any schedule
        setSchedules(prev => prev.filter(s => s.liabilityId !== id));
        if (isCloudConnected && currentUser) {
          await supabase.from('emi_schedules').delete().eq('liability_id', id);
        }
      }
    }

    if (isCloudConnected && currentUser) {
      const dbUpdates: any = {};
      if (updates.profileId !== undefined) dbUpdates.profile_id = updates.profileId;
      if (updates.providerName !== undefined) dbUpdates.provider_name = updates.providerName;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.statusNote !== undefined) dbUpdates.status_note = updates.statusNote;
      if (updates.emiAmount !== undefined) dbUpdates.emi_amount = updates.emiAmount;
      if (updates.tenure !== undefined) dbUpdates.tenure = updates.tenure;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
      if (updates.hasSchedule !== undefined) dbUpdates.has_schedule = updates.hasSchedule;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase.from('liabilities').update(dbUpdates).eq('id', id);
      if (error) {
        console.error('Error updating liability in Supabase:', error);
      }
    }
  }, [liabilities, generateAndAddSchedule, isCloudConnected, currentUser]);

  const deleteLiability = useCallback(async (id: string) => {
    setLiabilities(prev => prev.filter(l => l.id !== id));
    setSchedules(prev => prev.filter(s => s.liabilityId !== id));

    if (isCloudConnected && currentUser) {
      await supabase.from('liabilities').delete().eq('id', id);
    }
  }, [isCloudConnected, currentUser]);

  const addAmortizationSchedule = useCallback(async (schedule: EMISchedule) => {
    setSchedules(prev => [...prev.filter(s => s.liabilityId !== schedule.liabilityId), schedule]);

    if (isCloudConnected && currentUser) {
      await supabase.from('emi_schedules').upsert([{
        liability_id: schedule.liabilityId,
        user_id: currentUser.id,
        profile_id: schedule.profileId,
        title: schedule.title,
        original_amount: schedule.originalAmount,
        monthly_emi: schedule.monthlyEmi,
        total_tenure: schedule.totalTenure,
        months: schedule.months,
      }]);
    }
  }, [isCloudConnected, currentUser]);

  const convertToEmi = useCallback(async (liabilityId: string, emiAmount: number, tenure: number, startMonthDate: string) => {
    const liab = liabilities.find(l => l.id === liabilityId);
    if (!liab) return;

    const totalPayable = emiAmount * tenure;

    await generateAndAddSchedule(
      liabilityId, 
      liab.providerName, 
      liab.profileId, 
      totalPayable, 
      emiAmount, 
      tenure, 
      startMonthDate
    );

    await updateLiability(liabilityId, {
      status: 'converted_to_emi',
      statusNote: 'converted to emi',
      emiAmount,
      tenure,
      totalAmount: totalPayable,
      hasSchedule: true,
    });
  }, [liabilities, generateAndAddSchedule, updateLiability]);

  const toggleMonthPaid = useCallback(async (liabilityId: string, monthId: string) => {
    let targetSchedule: EMISchedule | null = null;

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

      if (allPaid && updatedMonths.length > 0) {
        updateLiability(liabilityId, { status: 'paid_off', statusNote: 'Fully Settled 🎉' });
        triggerCelebration();
      }

      const updated = { ...sch, months: updatedMonths };
      targetSchedule = updated;
      return updated;
    }));

    if (isCloudConnected && targetSchedule && currentUser) {
      await supabase.from('emi_schedules').update({
        months: (targetSchedule as EMISchedule).months
      }).eq('liability_id', liabilityId);
    }
  }, [updateLiability, triggerCelebration, isCloudConnected, currentUser]);

  const addExpense = useCallback(async (expense: Omit<ExpenseItem, 'id'>) => {
    const id = `exp-${Date.now()}`;
    const newExpense: ExpenseItem = { ...expense, id };
    setExpenses(prev => [newExpense, ...prev]);

    if (isCloudConnected && currentUser) {
      const { error } = await supabase.from('expenses').upsert([{
        id,
        user_id: currentUser.id,
        profile_id: expense.profileId,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        payment_method: expense.paymentMethod,
        is_recurring: Boolean(expense.isRecurring),
      }]);
      if (error) {
        console.error('Error inserting expense to Supabase:', error);
      }
    }
  }, [isCloudConnected, currentUser]);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));

    if (isCloudConnected && currentUser) {
      await supabase.from('expenses').delete().eq('id', id);
    }
  }, [isCloudConnected, currentUser]);

  const filteredLiabilities = useMemo(() => {
    return liabilities.filter(l => 
      selectedProfileId === 'all' ? true : l.profileId === selectedProfileId
    );
  }, [liabilities, selectedProfileId]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => 
      selectedProfileId === 'all' ? true : s.profileId === selectedProfileId
    );
  }, [schedules, selectedProfileId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      selectedProfileId === 'all' ? true : e.profileId === selectedProfileId
    );
  }, [expenses, selectedProfileId]);

  const summary: DashboardSummary = useMemo(() => {
    let totalLiabilitiesAmount = 0;
    let totalMonthlyEmi = 0;
    let activeEmiCount = 0;
    let creditCardDebt = 0;
    let loansCount = 0;
    let paidOffCount = 0;

    for (let i = 0; i < filteredLiabilities.length; i++) {
      const l = filteredLiabilities[i];
      totalLiabilitiesAmount += (l.amount || 0);

      if (l.status === 'paid_off') {
        paidOffCount++;
      } else {
        loansCount++;
        if (l.emiAmount) {
          totalMonthlyEmi += l.emiAmount;
        }
        if (l.type === 'emi' || l.status === 'converted_to_emi') {
          activeEmiCount++;
        }
        if (l.type === 'credit_card' && l.status === 'active') {
          creditCardDebt += (l.amount || 0);
        }
      }
    }

    let totalEmiLeft = 0;
    for (let j = 0; j < filteredSchedules.length; j++) {
      const sch = filteredSchedules[j];
      for (let k = 0; k < sch.months.length; k++) {
        const m = sch.months[k];
        if (!m.isPaid) {
          totalEmiLeft += m.amount;
        }
      }
    }

    let totalWealthCleared = 0;
    for (let i = 0; i < filteredLiabilities.length; i++) {
      const l = filteredLiabilities[i];
      if (l.status === 'paid_off') {
        totalWealthCleared += (l.totalAmount || l.amount || 0);
      }
    }
    for (let j = 0; j < filteredSchedules.length; j++) {
      const sch = filteredSchedules[j];
      for (let k = 0; k < sch.months.length; k++) {
        const m = sch.months[k];
        if (m.isPaid) {
          totalWealthCleared += m.amount;
        }
      }
    }

    return {
      totalLiabilitiesAmount,
      totalMonthlyEmi,
      totalEmiLeft,
      activeEmiCount,
      creditCardDebt,
      loansCount,
      paidOffCount,
      totalWealthCleared,
    };
  }, [filteredLiabilities, filteredSchedules]);

  const exportDataJSON = useCallback(() => {
    const exportData = {
      version: '2.0',
      user: currentUser?.name || 'User',
      exportedAt: new Date().toISOString(),
      profiles,
      liabilities,
      schedules,
      expenses,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tenura_${currentUser?.name?.toLowerCase() || 'vault'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [currentUser, profiles, liabilities, schedules, expenses]);

  const importDataJSON = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.liabilities && data.schedules) {
        if (data.profiles && Array.isArray(data.profiles)) setProfiles(data.profiles);
        setLiabilities(data.liabilities);
        setSchedules(data.schedules);
        if (data.expenses && Array.isArray(data.expenses)) setExpenses(data.expenses);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }, []);

  const resetToDefaultData = useCallback(() => {
    setProfiles(initialProfiles);
    setLiabilities(initialLiabilities);
    setSchedules(initialSchedules);
    setExpenses(initialExpenses);
    setSelectedProfileId('gaurav');
  }, []);

  const clearVaultData = useCallback(async () => {
    setLiabilities([]);
    setSchedules([]);
    setExpenses([]);

    if (isCloudConnected && currentUser) {
      await Promise.all([
        supabase.from('liabilities').delete().neq('id', 'null'),
        supabase.from('emi_schedules').delete().neq('liability_id', 'null'),
        supabase.from('expenses').delete().neq('id', 'null'),
      ]);
    }
  }, [isCloudConnected, currentUser]);

  const loadDemoData = useCallback(async () => {
    setProfiles(initialProfiles);
    setLiabilities(initialLiabilities);
    setSchedules(initialSchedules);
    setExpenses(initialExpenses);
    setSelectedProfileId('gaurav');

    if (isCloudConnected && currentUser) {
      for (const p of initialProfiles) {
        await supabase.from('profiles').upsert([{
          id: p.id,
          user_id: currentUser.id,
          name: p.name,
          initials: p.initials,
          role: p.role,
          accent_color: p.accentColor,
          monthly_budget: p.monthlyBudget,
        }]);
      }
      for (const l of initialLiabilities) {
        await supabase.from('liabilities').upsert([{
          id: l.id,
          user_id: currentUser.id,
          profile_id: l.profileId,
          provider_name: l.providerName,
          type: l.type,
          amount: l.amount,
          status: l.status,
          status_note: l.statusNote,
          emi_amount: l.emiAmount,
          tenure: l.tenure,
          total_amount: l.totalAmount,
          has_schedule: l.hasSchedule,
          notes: l.notes,
        }]);
      }
      for (const s of initialSchedules) {
        await supabase.from('emi_schedules').upsert([{
          liability_id: s.liabilityId,
          user_id: currentUser.id,
          profile_id: s.profileId,
          title: s.title,
          original_amount: s.originalAmount,
          monthly_emi: s.monthlyEmi,
          total_tenure: s.totalTenure,
          months: s.months,
        }]);
      }
      for (const e of initialExpenses) {
        await supabase.from('expenses').upsert([{
          id: e.id,
          user_id: currentUser.id,
          profile_id: e.profileId,
          title: e.title,
          amount: e.amount,
          category: e.category,
          date: e.date,
          payment_method: e.paymentMethod,
          is_recurring: e.isRecurring,
        }]);
      }
    }
  }, [isCloudConnected, currentUser]);

  const contextValue = useMemo(() => ({
    selectedProfileId,
    setSelectedProfileId,
    profiles,
    addProfile,
    deleteProfile,
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
    clearVaultData,
    loadDemoData,
  }), [
    selectedProfileId,
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
    clearVaultData,
    loadDemoData,
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
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
