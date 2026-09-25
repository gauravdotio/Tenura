import React, { useState, useMemo, useCallback } from 'react';
import { 
  Trash2, 
  Plus, 
  ArrowUpRight,
  Search,
  Check,
  RefreshCw,
  Pencil,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Liability } from '../types/finance';
import { formatINR, getBankBadgeStyle } from '../utils/formatters';

interface LoansTableProps {
  onOpenAddLiability: () => void;
  onOpenConvertToEmi: (liability: Liability) => void;
  onOpenEditLiability: (liability: Liability) => void;
  onScrollToSchedule: (liabilityId: string) => void;
}

export const LoansTable: React.FC<LoansTableProps> = ({
  onOpenAddLiability,
  onOpenConvertToEmi,
  onOpenEditLiability,
  onScrollToSchedule,
}) => {
  const { 
    filteredLiabilities, 
    deleteLiability, 
    updateLiability, 
    triggerCelebration,
    selectedProfileId,
    profiles
  } = useFinance();

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentProfileName = useMemo(() => {
    if (selectedProfileId === 'all') return 'Consolidated Portfolio';
    return profiles.find(p => p.id === selectedProfileId)?.name || 'This Account';
  }, [selectedProfileId, profiles]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filteredLiabilities.filter(item => {
      const matchesSearch = !q || 
        item.providerName.toLowerCase().includes(q) ||
        (item.statusNote && item.statusNote.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterType === 'all') return true;
      if (filterType === 'cc') return item.type === 'credit_card';
      if (filterType === 'emi') return item.type === 'emi' || item.status === 'converted_to_emi';
      if (filterType === 'paid') return item.status === 'paid_off';
      return true;
    });
  }, [filteredLiabilities, searchQuery, filterType]);

  const { totalAmountSum, totalEmiSum, totalPayableSum } = useMemo(() => {
    let amountSum = 0;
    let emiSum = 0;
    let payableSum = 0;

    for (let i = 0; i < filteredItems.length; i++) {
      const curr = filteredItems[i];
      amountSum += (curr.amount || 0);
      if (curr.status !== 'paid_off' && curr.emiAmount) {
        emiSum += curr.emiAmount;
      }
      payableSum += (curr.totalAmount || curr.amount || 0);
    }

    return { totalAmountSum: amountSum, totalEmiSum: emiSum, totalPayableSum: payableSum };
  }, [filteredItems]);

  const handleMarkSettled = useCallback((id: string) => {
    updateLiability(id, { status: 'paid_off', statusNote: 'Fully Settled 🎉' });
    triggerCelebration();
  }, [updateLiability, triggerCelebration]);

  const handleDelete = useCallback((id: string, name: string) => {
    if (window.confirm(`Delete ${name}?`)) {
      deleteLiability(id);
    }
  }, [deleteLiability]);

  return (
    <div className="rounded-2xl bg-[#0D121F]/90 border border-white/[0.08] overflow-hidden shadow-xl backdrop-blur-md">
      {/* Table Header & Toolbar */}
      <div className="p-3.5 sm:p-5 border-b border-white/[0.06] flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white/[0.01]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Active Liabilities & Credit Lines
            </h3>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-tabular font-medium border border-white/[0.08]">
              {filteredItems.length} records
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Manage your active credit cards, loans, and installment plans
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-blue-500 w-full sm:w-44 placeholder:text-slate-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${filterType === 'all' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('cc')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${filterType === 'cc' ? 'bg-rose-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setFilterType('emi')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${filterType === 'emi' ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              EMIs
            </button>
            <button
              onClick={() => setFilterType('paid')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${filterType === 'paid' ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Settled
            </button>
          </div>

          <button
            onClick={onOpenAddLiability}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all border border-rose-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Liability</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto smooth-scroll">
        <table className="w-full text-left text-sm border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.015] text-slate-400 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Provider / Instrument</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Principal / Balance</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Status</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Monthly EMI</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Tenure</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold">Total Payable</th>
              <th className="py-3 px-3.5 sm:px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 sm:py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3 px-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-white/[0.08] text-slate-400 mx-auto flex items-center justify-center shadow-lg">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        No liability records for {currentProfileName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        {selectedProfileId === 'all' 
                          ? 'No active credit cards or loans found across any accounts.' 
                          : `This account has zero outstanding debt. Add a credit card balance, bank loan, or consumer EMI to build this ledger.`}
                      </p>
                    </div>
                    <button
                      onClick={onOpenAddLiability}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record First Liability for {currentProfileName}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const badgeStyle = getBankBadgeStyle(item.providerName);
                const isConverted = item.status === 'converted_to_emi';
                const isPaid = item.status === 'paid_off';

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Provider Name */}
                    <td className="py-3 px-3.5 sm:px-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className={`px-2 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold font-tabular tracking-wider border flex-shrink-0 ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                          {badgeStyle.code}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors flex items-center gap-1.5 flex-wrap">
                            <span>{item.providerName}</span>
                            {item.hasSchedule && (
                              <button
                                onClick={() => onScrollToSchedule(item.id)}
                                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-normal flex items-center gap-0.5"
                                title="View amortization schedule"
                              >
                                View Schedule <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount (Red for Active Debt, Green if Settled) */}
                    <td className="py-3 px-3.5 sm:px-4 font-tabular text-xs sm:text-sm whitespace-nowrap">
                      {isPaid ? (
                        <span className="text-emerald-400 font-medium line-through opacity-75">
                          {formatINR(item.amount)}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">
                          {formatINR(item.amount)}
                        </span>
                      )}
                    </td>

                    {/* Status (Red for Active, Blue for EMI, Green for Settled) */}
                    <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                      {isConverted ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          <span>Converted to EMI</span>
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Settled (Wealth)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                          <span>Active Debt</span>
                        </span>
                      )}
                    </td>

                    {/* Monthly EMI (Blue) */}
                    <td className="py-3 px-3.5 sm:px-4 font-tabular whitespace-nowrap">
                      {item.emiAmount ? (
                        <span className="text-blue-400 font-bold text-xs sm:text-sm">
                          {formatINR(item.emiAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Tenure */}
                    <td className="py-3 px-3.5 sm:px-4 font-tabular whitespace-nowrap">
                      {item.tenure ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.05]">
                          {item.tenure} mo
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Total Payable */}
                    <td className="py-3 px-3.5 sm:px-4 font-tabular text-slate-300 font-medium whitespace-nowrap">
                      {item.totalAmount ? formatINR(item.totalAmount) : (
                        item.amount ? formatINR(item.amount) : '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.type === 'credit_card' && !isConverted && !isPaid && (
                          <button
                            onClick={() => onOpenConvertToEmi(item)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 text-xs font-medium transition-all"
                            title="Convert Card Balance to EMI"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span className="hidden sm:inline">Convert EMI</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenEditLiability(item)}
                          className="p-1.5 rounded-lg bg-blue-950/30 hover:bg-blue-900/50 text-blue-400 border border-blue-800/30 transition-colors active:scale-95"
                          title="Edit liability, amortization schedule & details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {!isPaid && (
                          <button
                            onClick={() => handleMarkSettled(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/30 transition-colors active:scale-95"
                            title="Mark as Settled (Add to Wealth)"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id, item.providerName)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-white/[0.06] transition-colors active:scale-95"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer Totals */}
          <tfoot>
            <tr className="bg-[#090D16]/90 border-t-2 border-slate-700/60 font-bold text-white text-xs sm:text-sm">
              <td className="py-3 px-3.5 sm:px-4 uppercase tracking-wider text-[10px] sm:text-xs text-slate-400 font-semibold">
                Total Summary
              </td>
              <td className="py-3 px-3.5 sm:px-4 font-tabular text-sm sm:text-base text-rose-400 font-bold whitespace-nowrap">
                {formatINR(totalAmountSum)}
              </td>
              <td className="py-3 px-3.5 sm:px-4 text-xs text-slate-500">
                —
              </td>
              <td className="py-3 px-3.5 sm:px-4 font-tabular text-blue-400 text-sm sm:text-base font-bold whitespace-nowrap">
                {formatINR(totalEmiSum)}
              </td>
              <td className="py-3 px-3.5 sm:px-4 text-xs text-slate-500">
                —
              </td>
              <td className="py-3 px-3.5 sm:px-4 font-tabular text-slate-200 whitespace-nowrap">
                {formatINR(totalPayableSum)}
              </td>
              <td className="py-3 px-3.5 sm:px-4 text-right text-[10px] sm:text-xs text-slate-400">
                Portfolio Total
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
