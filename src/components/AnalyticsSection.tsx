import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { TrendingDown, PieChart as ChartIcon, BarChart3, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatINR } from '../utils/formatters';

const CHART_PALETTE = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F43F5E'];

export const AnalyticsSection: React.FC = () => {
  const { filteredLiabilities, filteredSchedules } = useFinance();

  // 1. Calculate Monthly Outflow Projection (aggregated from all active schedules by month)
  const monthlyMap: { [key: string]: { monthLabel: string; totalDue: number; totalPaid: number; sortKey: string } } = {};

  filteredSchedules.forEach(sch => {
    sch.months.forEach(m => {
      const key = m.monthDate || m.monthLabel;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          monthLabel: m.monthLabel,
          totalDue: 0,
          totalPaid: 0,
          sortKey: key,
        };
      }
      monthlyMap[key].totalDue += m.amount;
      if (m.isPaid) {
        monthlyMap[key].totalPaid += m.amount;
      }
    });
  });

  const monthlyOutflowData = Object.values(monthlyMap)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(0, 12);

  // 2. Debt Burndown Timeline calculation
  let runningBalance = filteredLiabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  const burndownData = [
    { label: 'Current', balance: runningBalance }
  ];

  monthlyOutflowData.forEach(item => {
    runningBalance = Math.max(0, runningBalance - item.totalDue);
    burndownData.push({
      label: item.monthLabel.split(' ')[0],
      balance: runningBalance,
    });
  });

  // 3. Provider/Bank Distribution Donut Data
  const providerData = filteredLiabilities.map((l) => ({
    name: l.providerName,
    value: l.amount || 0,
  })).filter(d => d.value > 0);

  // Custom Fintech Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#090D16]/95 border border-white/[0.1] p-3 rounded-xl shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold text-slate-200 mb-1">{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-xs font-tabular font-medium" style={{ color: entry.color || '#10B981' }}>
              {entry.name}: {formatINR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>Financial Analytics & Forecasting</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Visual projections of monthly cashflow requirements, instrument exposure, and debt burndown
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart 1: Monthly Cashflow Outflow Projection */}
        <div className="lg:col-span-2 pro-card rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Monthly Cashflow Commitment (EMI Outflow)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Projected monthly EMI obligations per billing cycle</p>
            </div>
            <span className="text-[10px] text-cyan-400 font-tabular font-semibold px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
              12-Month Horizon
            </span>
          </div>

          <div className="h-64 w-full">
            {monthlyOutflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyOutflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => val.split(' ')[0]}
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalDue" name="EMI Due" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPaid" name="Paid" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No active monthly schedules recorded.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Debt Liability Distribution Donut */}
        <div className="pro-card rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <ChartIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exposure by Instrument</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Proportional liability distribution</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie
                    data={providerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {providerData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">No active liabilities recorded.</div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
            {providerData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
                ></span>
                <span className="truncate max-w-[110px]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Debt Burndown Timeline */}
        <div className="lg:col-span-3 pro-card rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Projected Debt Burndown Curve</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Estimated balance amortization as scheduled installments are settled
              </p>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndownData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="proBurndownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" name="Remaining Balance" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#proBurndownGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
