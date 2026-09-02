import React, { useState } from 'react';
import { X, Receipt } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { ExpenseCategory } from '../types/finance';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

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
    setTitle('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Log Expense</h3>
              <p className="text-xs text-gray-400">Record a one-off or monthly bill</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Profile Target */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                    profileId === p.id 
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                      : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span>{p.avatar}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Expense Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electricity Bill, WiFi, Groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono-nums text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="utilities">⚡ Utilities & Electricity</option>
              <option value="food_groceries">🛒 Groceries & Food</option>
              <option value="shopping">🛍️ Shopping & Lifestyle</option>
              <option value="transport">🚗 Transport & Fuel</option>
              <option value="housing">🏠 Rent & Maintenance</option>
              <option value="health">💊 Health & Medical</option>
              <option value="entertainment">🍿 Entertainment</option>
              <option value="other">📌 Other Spends</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              >
                <option value="UPI">UPI (GPay / PhonePe)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-gray-950 border-gray-700 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-xs text-gray-300 font-medium">Monthly recurring</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-semibold shadow-glow-cyan transition-all"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
