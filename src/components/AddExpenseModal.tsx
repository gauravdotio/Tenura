import React, { useState, useEffect } from 'react';
import { X, Receipt } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { ExpenseCategory } from '../types/finance';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { selectedProfileId } = useFinance();

  if (!isOpen) return null;

  return (
    <AddExpenseModalContent 
      key={`add-exp-${selectedProfileId}`} 
      onClose={onClose} 
    />
  );
};

interface AddExpenseModalContentProps {
  onClose: () => void;
}

const AddExpenseModalContent: React.FC<AddExpenseModalContentProps> = ({ onClose }) => {
  const { addExpense, profiles, selectedProfileId } = useFinance();

  const [profileId, setProfileId] = useState<string>(
    selectedProfileId === 'all' ? (profiles[0]?.id || 'gaurav') : selectedProfileId
  );
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('utilities');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    addExpense({
      profileId,
      title: title.trim(),
      amount: parseFloat(amount),
      category,
      date,
      paymentMethod,
      isRecurring,
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden animate-modalIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Log Operational Expense</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Record a one-off or recurring transaction</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 max-h-[82vh] overflow-y-auto smooth-scroll">
          
          {/* Target Profile */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Account / Member
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    profileId === p.id 
                      ? 'bg-cyan-600/15 border-cyan-500/50 text-cyan-300' 
                      : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold flex items-center justify-center">{p.initials}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expense Item Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electricity Bill, Fiber Broadband, Supplies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs font-tabular font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expense Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            >
              <option value="utilities">Utilities & Energy</option>
              <option value="food_groceries">Groceries & Household</option>
              <option value="shopping">Shopping & Equipment</option>
              <option value="transport">Transport & Logistics</option>
              <option value="housing">Housing & Maintenance</option>
              <option value="health">Healthcare & Medical</option>
              <option value="entertainment">Entertainment & Media</option>
              <option value="other">General Miscellaneous</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
              >
                <option value="UPI">UPI (Instant Transfer)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash Ledger</option>
              </select>
            </div>

            <div className="flex items-center pt-2 sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300 font-medium">Monthly recurring</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold shadow-sm shadow-cyan-600/20 transition-all"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
