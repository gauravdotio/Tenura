import React from 'react';
import { 
  CreditCard, 
  CalendarClock, 
  ShieldAlert, 
  PieChart,
  Percent
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

export const MetricsOverview: React.FC = () => {
  const { summary, selectedProfileId, profiles, filteredSchedules } = useFinance();

  const currentProfileName = selectedProfileId === 'all' 
    ? 'Household (Combined)' 
    : profiles.find(p => p.id === selectedProfileId)?.name || 'Profile';

  // Calculate total original amount of all active schedules vs remaining
  const totalOriginalEmiAmount = filteredSchedules.reduce((acc, sch) => acc + sch.originalAmount, 0);
  const paidEmiAmount = Math.max(0, totalOriginalEmiAmount - summary.totalEmiLeft);
  const progressPercent = totalOriginalEmiAmount > 0 
    ? Math.round((paidEmiAmount / totalOriginalEmiAmount) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Banner / Current Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-r from-gray-900/90 via-indigo-950/30 to-gray-900/90 p-4 rounded-2xl border border-indigo-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Financial Overview for</span>
              <span className="text-indigo-400 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm">
                {currentProfileName}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live amortization schedules, active credit lines, and monthly liability commitments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-gray-300 font-medium">{summary.loansCount} Active Liabilities</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span className="text-gray-300 font-medium">{summary.activeEmiCount} Active EMI Plans</span>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Outstanding Liabilities */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/70 border border-gray-800/80 p-5 shadow-lg group hover:border-indigo-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-600/10 rounded-full blur-2xl group-hover:bg-indigo-600/20 transition-all"></div>
          
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300/80">Total Active Debt</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono-nums tracking-tight">
              {formatINR(summary.totalLiabilitiesAmount)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <span>Includes CC balances & loan principals</span>
            </div>
          </div>
        </div>

        {/* Monthly EMI Commitment */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/70 border border-gray-800/80 p-5 shadow-lg group hover:border-cyan-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-600/10 rounded-full blur-2xl group-hover:bg-cyan-600/20 transition-all"></div>
          
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">Monthly EMI Outflow</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-cyan-400 font-mono-nums tracking-tight">
              {formatINR(summary.totalMonthlyEmi)}
              <span className="text-xs font-normal text-gray-400 ml-1">/ mo</span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1">
              <span>Across {summary.activeEmiCount} running installments</span>
            </div>
          </div>
        </div>

        {/* Total Left on EMIs */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/70 border border-gray-800/80 p-5 shadow-lg group hover:border-amber-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-600/10 rounded-full blur-2xl group-hover:bg-amber-600/20 transition-all"></div>
          
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">Remaining on EMIs</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono-nums tracking-tight">
              {formatINR(summary.totalEmiLeft)}
            </div>
            
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{progressPercent}% Paid off</span>
                <span>{formatINR(paidEmiAmount)} Cleared</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revolving Credit Card Balances */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-900/70 border border-gray-800/80 p-5 shadow-lg group hover:border-rose-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-600/10 rounded-full blur-2xl group-hover:bg-rose-600/20 transition-all"></div>
          
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">Active Revolving CC</span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-rose-400 font-mono-nums tracking-tight">
              {formatINR(summary.creditCardDebt)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-1">
              <span>Non-EMI revolving credit balances</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
