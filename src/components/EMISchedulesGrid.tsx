import React from 'react';
import { 
  Check, 
  Clock, 
  Zap
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

export const EMISchedulesGrid: React.FC = () => {
  const { filteredSchedules, toggleMonthPaid } = useFinance();

  if (filteredSchedules.length === 0) {
    return (
      <div className="rounded-2xl bg-[#0D111C]/60 border border-white/[0.06] p-6 sm:p-8 text-center animate-fadeIn">
        <p className="text-slate-400 text-sm">No active amortization schedules found for this account.</p>
        <p className="text-slate-500 text-xs mt-1">Convert an active credit card balance or add a loan to generate monthly schedules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>EMI Breakdown & Amortization Schedules</span>
            <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-tabular font-medium">
              {filteredSchedules.length} Active Plans
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Detailed month-by-month installment tracking with live balance countdown
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {filteredSchedules.map((schedule) => {
          const paidMonths = schedule.months.filter(m => m.isPaid).length;
          const totalMonths = schedule.months.length;
          const paidAmount = schedule.months.filter(m => m.isPaid).reduce((sum, m) => sum + m.amount, 0);
          const totalLeft = Math.max(0, schedule.originalAmount - paidAmount);
          const percentPaid = totalMonths > 0 ? Math.round((paidMonths / totalMonths) * 100) : 0;
          const isFullySettled = paidMonths === totalMonths && totalMonths > 0;

          // Find the next upcoming unpaid month
          const nextUnpaidMonth = schedule.months.find(m => !m.isPaid);

          return (
            <div 
              key={schedule.liabilityId} 
              id={`schedule-${schedule.liabilityId}`}
              className="pro-card rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all duration-200"
            >
              {/* Card Header */}
              <div className="p-3.5 sm:p-5 bg-white/[0.015] border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {schedule.title}
                      </h4>
                      {isFullySettled ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Fully Cleared
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/[0.06]">
                          {schedule.totalTenure} Mo Plan
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Total: <strong className="text-slate-200 font-tabular font-semibold">{formatINR(schedule.originalAmount)}</strong></span>
                      <span>•</span>
                      <span>EMI: <strong className="text-emerald-400 font-tabular font-semibold">{formatINR(schedule.monthlyEmi)}/mo</strong></span>
                    </div>
                  </div>

                  {/* Quick "Pay Next Month" action */}
                  {nextUnpaidMonth && (
                    <button
                      onClick={() => toggleMonthPaid(schedule.liabilityId, nextUnpaidMonth.id)}
                      className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all flex-shrink-0"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Pay {nextUnpaidMonth.monthLabel.split(' ')[0]}</span>
                    </button>
                  )}
                </div>

                {/* Progress Bar & Stats */}
                <div className="mt-3 sm:mt-3.5 space-y-1.5">
                  <div className="flex justify-between text-[11px] sm:text-xs font-medium">
                    <span className="text-slate-400">
                      Progress: <span className="text-white font-semibold font-tabular">{paidMonths}</span> / {totalMonths} installments cleared
                    </span>
                    <span className="text-emerald-400 font-semibold font-tabular">
                      {percentPaid}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFullySettled 
                          ? 'bg-emerald-400' 
                          : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                      }`}
                      style={{ width: `${percentPaid}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Table */}
              <div className="overflow-x-auto flex-1 max-h-64 sm:max-h-72 overflow-y-auto smooth-scroll">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#0D111C]/95 backdrop-blur-md z-10">
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3 sm:px-4">Billing Month</th>
                      <th className="py-2.5 px-3 sm:px-4">Amount</th>
                      <th className="py-2.5 px-3 sm:px-4">Installment</th>
                      <th className="py-2.5 px-3 sm:px-4">Status</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {schedule.months.map((m) => {
                      return (
                        <tr 
                          key={m.id}
                          className={`transition-colors ${
                            m.isPaid 
                              ? 'bg-emerald-500/[0.03] text-slate-400' 
                              : 'hover:bg-white/[0.02] text-slate-200'
                          }`}
                        >
                          {/* Month */}
                          <td className="py-2 px-3 sm:px-4 font-medium whitespace-nowrap">
                            <span className={m.isPaid ? 'line-through text-slate-500' : 'text-slate-200'}>
                              {m.monthLabel}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-2 px-3 sm:px-4 font-tabular font-medium whitespace-nowrap">
                            <span className={m.isPaid ? 'text-slate-500 line-through' : 'text-emerald-400 font-semibold'}>
                              {formatINR(m.amount)}
                            </span>
                          </td>

                          {/* Installment */}
                          <td className="py-2 px-3 sm:px-4 font-tabular text-slate-400">
                            #{m.installmentIndex}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 sm:px-4 whitespace-nowrap">
                            {m.isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-400">
                                <Check className="w-3 h-3" /> Paid {m.paidDate ? `(${m.paidDate.slice(5)})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-400/90 font-medium">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-2 px-3 sm:px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => toggleMonthPaid(schedule.liabilityId, m.id)}
                              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium transition-all active:scale-95 ${
                                m.isPaid
                                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                              }`}
                            >
                              {m.isPaid ? 'Undo' : 'Mark Paid'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card Footer: "Total Left" */}
              <div className="p-3 sm:p-3.5 sm:px-5 bg-[#0A0E18] border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] sm:text-xs uppercase font-semibold tracking-wider text-slate-400">
                  Total Left on Plan
                </span>
                <div className="text-right">
                  <span className="text-sm sm:text-base font-bold text-amber-400 font-tabular">
                    {formatINR(totalLeft)}
                  </span>
                  {totalLeft === 0 && (
                    <span className="text-xs text-emerald-400 font-semibold ml-2">Settled</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
