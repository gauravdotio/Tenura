import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Zap, 
  Car, 
  Home, 
  HeartPulse, 
  Film, 
  HelpCircle,
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

  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const budget = currentProfile?.monthlyBudget || 75000;

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'utilities': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'food_groceries': return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'shopping': return <Tag className="w-4 h-4 text-purple-400" />;
      case 'transport': return <Car className="w-4 h-4 text-cyan-400" />;
      case 'housing': return <Home className="w-4 h-4 text-indigo-400" />;
      case 'health': return <HeartPulse className="w-4 h-4 text-rose-400" />;
      case 'entertainment': return <Film className="w-4 h-4 text-pink-400" />;
      default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const filtered = filteredExpenses.filter(e => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPercent = Math.min(100, Math.round((totalExpense / budget) * 100));

  return (
    <div className="rounded-2xl bg-gray-900/80 border border-gray-800/90 overflow-hidden shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-800/90 bg-gray-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-cyan-400" />
            <span>Daily & Monthly Expenses Log</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Log variable day-to-day bills, utilities, groceries, and miscellaneous spends
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            <option value="utilities">Utilities</option>
            <option value="food_groceries">Food & Groceries</option>
            <option value="shopping">Shopping</option>
            <option value="transport">Transport</option>
          </select>

          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-glow-cyan transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log Expense</span>
          </button>
        </div>
      </div>

      {/* Budget Summary Bar */}
      <div className="p-4 bg-gray-950/60 border-b border-gray-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-gray-400">Total Variable Spends</span>
          <div className="text-lg font-bold text-white font-mono-nums mt-0.5">
            {formatINR(totalExpense)}
          </div>
        </div>
        <div>
          <span className="text-gray-400">Monthly Budget Cap</span>
          <div className="text-lg font-bold text-indigo-300 font-mono-nums mt-0.5">
            {formatINR(budget)}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Budget Remaining</span>
            <span className="text-emerald-400 font-semibold">{100 - budgetPercent}% free</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercent > 90 ? 'bg-rose-500' : budgetPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${budgetPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="divide-y divide-gray-800/50 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs">
            No expenses logged in this view.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-800 border border-gray-700/60">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span className="capitalize">{item.paymentMethod}</span>
                    {item.isRecurring && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 text-[10px] border border-indigo-500/20">Recurring</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-white font-mono-nums">{formatINR(item.amount)}</div>
                  <div className="text-[11px] text-gray-400 capitalize">{item.category.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={() => deleteExpense(item.id)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title="Delete expense"
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
