import React from 'react';
import { 
  CreditCard, 
  CalendarClock, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

export const MetricsOverview: React.FC = () => {
  const { summary, selectedProfileId, profiles, filteredSchedules } = useFinance();

  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const currentProfileName = selectedProfileId === 'all' 
    ? 'Household (Consolidated)' 
    : `${currentProfile?.name || 'Account'} (${currentProfile?.role || 'Active'})`;

  // Calculate total original amount of all active schedules vs remaining
  const totalOriginalEmiAmount = filteredSchedules.reduce((acc, sch) => acc + sch.originalAmount, 0);
  const paidEmiAmount = Math.max(0, totalOriginalEmiAmount - summary.totalEmiLeft);
  const progressPercent = totalOriginalEmiAmount > 0 
    ? Math.round((paidEmiAmount / totalOriginalEmiAmount) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-[#0D111C]/80 border border-white/[0.06] backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Viewing Portfolio:</span>
              <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]">
                {currentProfileName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live amortization schedules, active revolving credit, and monthly outflow forecasts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/[0.06] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300 font-medium">{summary.loansCount} Active Liabilities</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/[0.06] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300 font-medium">{summary.activeEmiCount} Active EMI Plans</span>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Outstanding Liabilities */}
        <div className="pro-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Active Debt</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-white font-tabular tracking-tight">
              {formatINR(summary.totalLiabilitiesAmount)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Principal across all active cards & loans</span>
            </div>
          </div>
        </div>

        {/* Monthly EMI Commitment */}
        <div className="pro-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly EMI Outflow</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-400 font-tabular tracking-tight">
              {formatINR(summary.totalMonthlyEmi)}
              <span className="text-xs font-normal text-slate-400 ml-1.5">/ mo</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Committed across {summary.activeEmiCount} active schedules</span>
            </div>
          </div>
        </div>

        {/* Total Left on EMIs */}
        <div className="pro-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Remaining on EMIs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="text-[11px] font-bold font-tabular">%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-tabular tracking-tight">
              {formatINR(summary.totalEmiLeft)}
            </div>
            
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>{progressPercent}% Complete</span>
                <span className="text-emerald-400">{formatINR(paidEmiAmount)} Cleared</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revolving Credit Card Balances */}
        <div className="pro-card rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"></div>
          
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Revolving Credit Line</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 font-tabular tracking-tight">
              {formatINR(summary.creditCardDebt)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Non-amortized revolving balances</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
