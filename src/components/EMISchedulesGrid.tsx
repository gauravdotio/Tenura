import React from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

export const EMISchedulesGrid: React.FC = () => {
  const { filteredSchedules, toggleMonthPaid } = useFinance();

  if (filteredSchedules.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-8 text-center">
        <p className="text-gray-400 text-sm">No active EMI amortization schedules found.</p>
        <p className="text-gray-500 text-xs mt-1">Convert a credit card or add a loan with tenure to track monthly payments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>EMI Breakdown & Amortization Schedules</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium">
              {filteredSchedules.length} Plans Active
            </span>
          </h3>
          <p className="text-xs text-gray-400">
            Month-by-month installment checklists with live "Total Left" tracking (matching sheet tables)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="rounded-2xl bg-gray-900/90 border border-gray-800/90 overflow-hidden shadow-xl flex flex-col transition-all hover:border-gray-700"
            >
              {/* Card Header (Matching Google Sheet table title: "AC EMI - Total amount: 27,972") */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-950 via-gray-900 to-indigo-950/40 border-b border-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        {schedule.title}
                      </h4>
                      {isFullySettled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Fully Cleared
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {schedule.totalTenure} Months Plan
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                      <span>Total Amount: <strong className="text-white font-mono-nums">{formatINR(schedule.originalAmount)}</strong></span>
                      <span>•</span>
                      <span>EMI: <strong className="text-emerald-400 font-mono-nums">{formatINR(schedule.monthlyEmi)}/mo</strong></span>
                    </div>
                  </div>

                  {/* Quick "Pay Next Month" action */}
                  {nextUnpaidMonth && (
                    <button
                      onClick={() => toggleMonthPaid(schedule.liabilityId, nextUnpaidMonth.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-glow-emerald transition-all transform active:scale-95"
                      title={`Pay for ${nextUnpaidMonth.monthLabel}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Pay {nextUnpaidMonth.monthLabel.split(' ')[0]}</span>
                    </button>
                  )}
                </div>

                {/* Progress Bar & Stats */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-medium">
                      Installments: <span className="text-white font-semibold">{paidMonths}</span> / {totalMonths} paid
                    </span>
                    <span className="text-emerald-400 font-semibold font-mono-nums">
                      {percentPaid}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
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
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-950/70 border-b border-gray-800/80 text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Months</th>
                      <th className="py-2.5 px-3.5">EMI</th>
                      <th className="py-2.5 px-3.5">Tenure</th>
                      <th className="py-2.5 px-3.5">Status</th>
                      <th className="py-2.5 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {schedule.months.map((m) => {
                      return (
                        <tr 
                          key={m.id}
                          className={`transition-colors ${
                            m.isPaid 
                              ? 'bg-emerald-950/15 text-gray-400' 
                              : 'hover:bg-gray-800/40 text-gray-200'
                          }`}
                        >
                          {/* Months */}
                          <td className="py-2.5 px-3.5 font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className={`w-3.5 h-3.5 ${m.isPaid ? 'text-emerald-500' : 'text-gray-400'}`} />
                              <span className={m.isPaid ? 'line-through text-gray-500' : 'text-white'}>
                                {m.monthLabel}
                              </span>
                            </div>
                          </td>

                          {/* EMI */}
                          <td className="py-2.5 px-3.5 font-mono-nums font-semibold">
                            <span className={m.isPaid ? 'text-gray-500 line-through' : 'text-emerald-400'}>
                              {formatINR(m.amount)}
                            </span>
                          </td>

                          {/* Tenure */}
                          <td className="py-2.5 px-3.5 font-mono-nums">
                            <span className="px-2 py-0.5 rounded bg-gray-800/80 text-gray-300 font-medium">
                              {m.installmentIndex}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3.5">
                            {m.isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paid {m.paidDate ? `(${m.paidDate.slice(5)})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                                <Clock className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>

                          {/* Action toggle */}
                          <td className="py-2.5 px-3.5 text-right">
                            <button
                              onClick={() => toggleMonthPaid(schedule.liabilityId, m.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                m.isPaid
                                  ? 'bg-gray-850 hover:bg-gray-700 text-gray-300'
                                  : 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm'
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
              <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                  Total Left
                </span>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-amber-400 font-mono-nums">
                    {formatINR(totalLeft)}
                  </span>
                  {totalLeft === 0 && (
                    <span className="text-xs text-emerald-400 font-semibold ml-2">🎉 Zero Balance</span>
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
