import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  CheckCircle, 
  Trash2, 
  Plus, 
  ArrowRight,
  CheckCircle2,
  Clock,
  Search
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Liability } from '../types/finance';
import { formatINR, getBankBadgeColor } from '../utils/formatters';

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
    <div className="rounded-2xl bg-gray-900/80 border border-gray-800/90 overflow-hidden shadow-xl backdrop-blur-md">
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-gray-800/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950/40">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>All Active Liabilities & Cards</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-medium">
                {filteredItems.length} records
              </span>
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Credit cards, active loans, and converted EMI installments (as in sheet master table)
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-xs focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('cc')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'cc' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setFilterType('emi')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'emi' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-400 hover:text-gray-200'}`}
            >
              EMIs
            </button>
          </div>

          <button
            onClick={onOpenAddLiability}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800/80 bg-gray-950/60 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4 font-semibold">Provider Name</th>
              <th className="py-3.5 px-4 font-semibold">Amount</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold">EMI</th>
              <th className="py-3.5 px-4 font-semibold">Tenure</th>
              <th className="py-3.5 px-4 font-semibold">Total Amount</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-500 text-sm">
                  No records found for this view. Click <strong>+ Add Row</strong> to create one.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const badgeStyle = getBankBadgeColor(item.providerName);
                const isConverted = item.status === 'converted_to_emi';
                const isPaid = item.status === 'paid_off';

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-850/50 transition-colors group"
                  >
                    {/* Provider Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.text} shadow-sm`}>
                          {item.type === 'credit_card' ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                            <span>{item.providerName}</span>
                            {item.hasSchedule && (
                              <button
                                onClick={() => onScrollToSchedule(item.id)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-normal flex items-center gap-0.5"
                                title="Jump to month-by-month schedule"
                              >
                                View Schedule <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-gray-400">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-mono-nums font-bold text-white text-base">
                      {formatINR(item.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {isConverted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Clock className="w-3 h-3" />
                          converted to emi
                        </span>
                      ) : isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Settled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                          Active
                        </span>
                      )}
                    </td>

                    {/* EMI */}
                    <td className="py-3.5 px-4 font-mono-nums">
                      {item.emiAmount ? (
                        <span className="text-emerald-400 font-bold">
                          {formatINR(item.emiAmount)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Tenure */}
                    <td className="py-3.5 px-4 font-mono-nums">
                      {item.tenure ? (
                        <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 text-xs font-medium border border-gray-700/60">
                          {item.tenure}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 font-mono-nums text-gray-300 font-medium">
                      {item.totalAmount ? formatINR(item.totalAmount) : (
                        item.amount ? formatINR(item.amount) : '-'
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.type === 'credit_card' && !isConverted && !isPaid && (
                          <button
                            onClick={() => onOpenConvertToEmi(item)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-xs font-medium transition-colors"
                            title="Convert credit card bill into an EMI plan"
                          >
                            Convert to EMI
                          </button>
                        )}

                        {!isPaid && (
                          <button
                            onClick={() => {
                              updateLiability(item.id, { status: 'paid_off' });
                              triggerCelebration();
                            }}
                            className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 transition-colors"
                            title="Mark Settled"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${item.providerName}?`)) {
                              deleteLiability(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 transition-colors"
                          title="Delete"
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
            <tr className="bg-indigo-950/40 border-t-2 border-indigo-900/60 font-bold text-white text-sm">
              <td className="py-4 px-4 uppercase tracking-wider text-xs text-indigo-300">
                Total
              </td>
              <td className="py-4 px-4 font-mono-nums text-lg text-indigo-300 font-extrabold">
                {formatINR(totalAmountSum)}
              </td>
              <td className="py-4 px-4 text-xs text-gray-400">
                -
              </td>
              <td className="py-4 px-4 font-mono-nums text-emerald-400 text-base font-extrabold">
                {formatINR(totalEmiSum)}
              </td>
              <td className="py-4 px-4 text-xs text-gray-400">
                -
              </td>
              <td className="py-4 px-4 font-mono-nums text-gray-200">
                {formatINR(totalPayableSum)}
              </td>
              <td className="py-4 px-4 text-right text-xs text-indigo-300">
                Total
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
