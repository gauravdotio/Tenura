import React, { useState } from 'react';
import { 
  Trash2, 
  Plus, 
  ArrowUpRight,
  Search,
  Check,
  RefreshCw
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Liability } from '../types/finance';
import { formatINR, getBankBadgeStyle } from '../utils/formatters';

interface LoansTableProps {
  onOpenAddLiability: () => void;
  onOpenConvertToEmi: (liability: Liability) => void;
  onScrollToSchedule: (liabilityId: string) => void;
}

export const LoansTable: React.FC<LoansTableProps> = ({
  onOpenAddLiability,
  onOpenConvertToEmi,
  onScrollToSchedule,
}) => {
  const { 
    filteredLiabilities, 
    deleteLiability, 
    updateLiability, 
    triggerCelebration,
  } = useFinance();

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = filteredLiabilities.filter(item => {
    const matchesSearch = item.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.statusNote && item.statusNote.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'cc') return item.type === 'credit_card';
    if (filterType === 'emi') return item.type === 'emi' || item.status === 'converted_to_emi';
    if (filterType === 'paid') return item.status === 'paid_off';
    return true;
  });

  const totalAmountSum = filteredItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalEmiSum = filteredItems.reduce((acc, curr) => {
    return curr.status !== 'paid_off' && curr.emiAmount ? acc + curr.emiAmount : acc;
  }, 0);
  const totalPayableSum = filteredItems.reduce((acc, curr) => acc + (curr.totalAmount || curr.amount || 0), 0);

  return (
    <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.07] overflow-hidden shadow-xl backdrop-blur-xl">
      {/* Table Header & Toolbar */}
      <div className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/[0.01]">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">
              Active Liabilities & Credit Lines
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-tabular font-medium border border-white/[0.08]">
              {filteredItems.length} records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Master registry of revolving credit cards, active term loans, and converted EMI installments
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/[0.08] text-slate-200 text-xs focus:outline-none focus:border-indigo-500 w-36 sm:w-44 placeholder:text-slate-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('cc')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'cc' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setFilterType('emi')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'emi' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              EMIs
            </button>
          </div>

          <button
            onClick={onOpenAddLiability}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all border border-indigo-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.015] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4 font-semibold">Provider / Instrument</th>
              <th className="py-3 px-4 font-semibold">Principal / Balance</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Monthly EMI</th>
              <th className="py-3 px-4 font-semibold">Tenure</th>
              <th className="py-3 px-4 font-semibold">Total Payable</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                  No liability records match this criteria.
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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold font-tabular tracking-wider border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text}`}>
                          {badgeStyle.code}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                            <span>{item.providerName}</span>
                            {item.hasSchedule && (
                              <button
                                onClick={() => onScrollToSchedule(item.id)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-normal flex items-center gap-0.5"
                                title="View amortization schedule"
                              >
                                View Schedule <ArrowUpRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-tabular font-bold text-white text-sm">
                      {formatINR(item.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {isConverted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/[0.08] text-cyan-300 border border-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          converted to emi
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/[0.08] text-indigo-300 border border-indigo-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </td>

                    {/* EMI */}
                    <td className="py-3.5 px-4 font-tabular">
                      {item.emiAmount ? (
                        <span className="text-emerald-400 font-bold text-sm">
                          {formatINR(item.emiAmount)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Tenure */}
                    <td className="py-3.5 px-4 font-tabular">
                      {item.tenure ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.05]">
                          {item.tenure} mo
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Total Payable */}
                    <td className="py-3.5 px-4 font-tabular text-slate-300 font-medium">
                      {item.totalAmount ? formatINR(item.totalAmount) : (
                        item.amount ? formatINR(item.amount) : '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.type === 'credit_card' && !isConverted && !isPaid && (
                          <button
                            onClick={() => onOpenConvertToEmi(item)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Convert credit card bill into an EMI plan"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Convert</span>
                          </button>
                        )}

                        {!isPaid && (
                          <button
                            onClick={() => {
                              updateLiability(item.id, { status: 'paid_off' });
                              triggerCelebration();
                            }}
                            className="p-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/30 transition-colors"
                            title="Mark as Settled"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${item.providerName}?`)) {
                              deleteLiability(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-white/[0.06] transition-colors"
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
            <tr className="bg-[#090D16]/90 border-t-2 border-indigo-500/30 font-bold text-white text-sm">
              <td className="py-3.5 px-4 uppercase tracking-wider text-xs text-indigo-300 font-semibold">
                Total Portfolio Summary
              </td>
              <td className="py-3.5 px-4 font-tabular text-base text-indigo-200 font-bold">
                {formatINR(totalAmountSum)}
              </td>
              <td className="py-3.5 px-4 text-xs text-slate-500">
                —
              </td>
              <td className="py-3.5 px-4 font-tabular text-emerald-400 text-base font-bold">
                {formatINR(totalEmiSum)}
              </td>
              <td className="py-3.5 px-4 text-xs text-slate-500">
                —
              </td>
              <td className="py-3.5 px-4 font-tabular text-slate-200">
                {formatINR(totalPayableSum)}
              </td>
              <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                Consolidated
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
