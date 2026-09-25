import React, { useMemo } from 'react';
import { 
  CreditCard, 
  CalendarClock, 
  TrendingUp, 
  TrendingDown,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

export const MetricsOverview: React.FC = () => {
  const { summary, selectedProfileId, profiles, filteredSchedules } = useFinance();

  const currentProfile = useMemo(() => profiles.find(p => p.id === selectedProfileId), [profiles, selectedProfileId]);
  
  const currentProfileName = useMemo(() => {
    if (selectedProfileId === 'all') return 'Consolidated Portfolio';
    return currentProfile?.name || 'Primary Account';
  }, [selectedProfileId, currentProfile]);

  const { paidEmiAmount, progressPercent } = useMemo(() => {
    const totalOriginal = filteredSchedules.reduce((acc, sch) => acc + sch.originalAmount, 0);
    const paid = Math.max(0, totalOriginal - summary.totalEmiLeft);
    const pct = totalOriginal > 0 ? Math.round((paid / totalOriginal) * 100) : 0;
    return { paidEmiAmount: paid, progressPercent: pct };
  }, [filteredSchedules, summary.totalEmiLeft]);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Portfolio Quick Selector & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#0D121F]/90 border border-white/[0.08] backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">{currentProfileName}</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Live Ledger</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Overview of your liabilities, monthly commitments, and accumulated wealth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs self-start sm:self-auto flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5 text-rose-300 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>{summary.loansCount} Active Liabilities</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5 text-blue-300 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>{summary.activeEmiCount} Active Plans</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-emerald-300 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{summary.paidOffCount} Settled</span>
          </div>
        </div>
      </div>

      {/* 4 Primary Red / Green / Blue Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* 1. GREEN CARD: Wealth & Settled Capital */}
        <div className="rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-[#0B1516] to-[#0A101A] border border-emerald-500/30 shadow-lg group transition-all hover:border-emerald-500/50">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-300 mb-2 sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Wealth & Settled</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400 font-tabular tracking-tight">
              {formatINR(summary.totalWealthCleared)}
            </div>
            
            <div className="space-y-1 pt-0.5">
              <div className="w-full bg-emerald-950/60 rounded-full h-1.5 overflow-hidden border border-emerald-500/20">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-emerald-500" 
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span className="text-emerald-300 font-semibold">{progressPercent}% Cleared</span>
                <span>{formatINR(paidEmiAmount)} paid off</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. RED CARD 1: Total Active Debt & Loans */}
        <div className="rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-rose-950/40 via-[#180C14] to-[#0A101A] border border-rose-500/30 shadow-lg group transition-all hover:border-rose-500/50">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-300 mb-2 sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Total Active Debt</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-400 font-tabular tracking-tight">
              {formatINR(summary.totalLiabilitiesAmount)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400">
              Total principal owed across all active loans
            </div>
          </div>
        </div>

        {/* 3. RED CARD 2: Credit Card Balances */}
        <div className="rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-rose-950/30 via-[#160B12] to-[#0A101A] border border-rose-500/25 shadow-lg group transition-all hover:border-rose-500/40">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-300 mb-2 sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-400" />
              <span>Credit Card Balance</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-400 font-tabular tracking-tight">
              {formatINR(summary.creditCardDebt)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400">
              Active revolving credit card dues
            </div>
          </div>
        </div>

        {/* 4. BLUE CARD: Monthly EMI Commitment */}
        <div className="rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-blue-950/40 via-[#0B1220] to-[#0A101A] border border-blue-500/30 shadow-lg group transition-all hover:border-blue-500/50">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-300 mb-2 sm:mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-blue-400" />
              <span>Monthly EMI Outflow</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400 font-tabular tracking-tight">
              {formatINR(summary.totalMonthlyEmi)}
              <span className="text-xs font-normal text-slate-400 ml-1">/ month</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between">
              <span>{summary.activeEmiCount} Active Plans</span>
              <span className="text-blue-300 font-medium">{formatINR(summary.totalEmiLeft)} left</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
