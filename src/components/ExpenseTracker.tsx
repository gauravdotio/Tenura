import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Zap, 
  Car, 
  Home, 
  Activity, 
  Film, 
  Tag
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { ExpenseCategory } from '../types/finance';
import { formatINR } from '../utils/formatters';

interface ExpenseTrackerProps {
  onOpenAddExpense: () => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ onOpenAddExpense }) => {
  const { filteredExpenses, deleteExpense, selectedProfileId, profiles } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currentProfile = useMemo(() => profiles.find(p => p.id === selectedProfileId), [profiles, selectedProfileId]);
  const budget = currentProfile?.monthlyBudget || 75000;

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'utilities': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'food_groceries': return <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />;
      case 'shopping': return <Tag className="w-3.5 h-3.5 text-indigo-400" />;
      case 'transport': return <Car className="w-3.5 h-3.5 text-cyan-400" />;
      case 'housing': return <Home className="w-3.5 h-3.5 text-blue-400" />;
      case 'health': return <Activity className="w-3.5 h-3.5 text-rose-400" />;
      case 'entertainment': return <Film className="w-3.5 h-3.5 text-purple-400" />;
      default: return <Receipt className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const filtered = useMemo(() => {
    return filteredExpenses.filter(e => {
      if (selectedCategory === 'all') return true;
      return e.category === selectedCategory;
    });
  }, [filteredExpenses, selectedCategory]);

  const { totalExpense, budgetPercent } = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pct = Math.min(100, Math.round((total / budget) * 100));
    return { totalExpense: total, budgetPercent: pct };
  }, [filteredExpenses, budget]);

  return (
    <div className="rounded-2xl bg-[#0D111C]/80 border border-white/[0.07] overflow-hidden shadow-xl backdrop-blur-md animate-fadeIn">
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-white/[0.06] bg-white/[0.015] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-400" />
            <span>Daily Expenses</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Track daily living costs, household utilities, and recurring subscriptions
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            <option value="utilities">Utilities & Bills</option>
            <option value="food_groceries">Supplies & Groceries</option>
            <option value="shopping">Shopping & Hardware</option>
            <option value="transport">Transport & Fuel</option>
          </select>

          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold shadow-sm shadow-cyan-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Entry</span>
          </button>
        </div>
      </div>

      {/* Budget Bar */}
      <div className="p-3.5 sm:p-4 bg-[#0A0E18] border-b border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
        <div>
          <span className="text-slate-400 text-[11px] sm:text-xs">Total Variable Spends</span>
          <div className="text-sm sm:text-base font-bold text-white font-tabular mt-0.5">
            {formatINR(totalExpense)}
          </div>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] sm:text-xs">Monthly Budget Threshold</span>
          <div className="text-sm sm:text-base font-bold text-indigo-300 font-tabular mt-0.5">
            {formatINR(budget)}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center text-[11px] sm:text-xs">
            <span className="text-slate-400">Remaining Cushion</span>
            <span className="text-emerald-400 font-semibold font-tabular">{100 - budgetPercent}% free</span>
          </div>
          <div className="w-full bg-slate-850 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                budgetPercent > 90 ? 'bg-rose-500' : budgetPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto smooth-scroll">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No expenses logged in this view.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="p-3 sm:px-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">{item.title}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span className="capitalize">{item.paymentMethod}</span>
                    {item.isRecurring && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 text-[9px] sm:text-[10px] border border-indigo-500/20 font-medium">Recurring</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-bold text-white font-tabular">{formatINR(item.amount)}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{item.category.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={() => deleteExpense(item.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors active:scale-95"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
