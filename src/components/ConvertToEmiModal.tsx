import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Liability } from '../types/finance';
import { formatINR } from '../utils/formatters';

interface ConvertToEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability: Liability | null;
}

export const ConvertToEmiModal: React.FC<ConvertToEmiModalProps> = ({ isOpen, onClose, liability }) => {
  const { convertToEmi } = useFinance();

  const [tenure, setTenure] = useState<number>(9);
  const [emiAmount, setEmiAmount] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('2026-10');

  useEffect(() => {
    if (liability) {
      // Default estimation: simple equal division
      const defaultEmi = Math.round(liability.amount / (tenure || 9));
      setEmiAmount(defaultEmi.toString());
    }
  }, [liability, tenure]);

  if (!isOpen || !liability) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numEmi = parseFloat(emiAmount);
    if (!numEmi || tenure <= 0) return;

    convertToEmi(liability.id, numEmi, tenure, startMonth);
    onClose();
  };

  const totalCalculated = (parseFloat(emiAmount) || 0) * tenure;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Convert to EMI Plan</h3>
              <p className="text-xs text-gray-400">{liability.providerName} (Bal: {formatINR(liability.amount)})</p>
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
          <div className="p-3.5 rounded-xl bg-gray-950/80 border border-gray-800 text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Balance:</span>
              <span className="font-bold font-mono-nums text-white">{formatINR(liability.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Payable on Plan:</span>
              <span className="font-bold font-mono-nums text-cyan-400">{formatINR(totalCalculated)}</span>
            </div>
          </div>

          {/* Quick Tenure Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Tenure Selection
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 9, 12].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setTenure(m)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                    tenure === m 
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' 
                      : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {m} Mo
                </button>
              ))}
            </div>
          </div>

          {/* Monthly EMI & Custom Tenure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Monthly EMI (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 2880"
                value={emiAmount}
                onChange={(e) => setEmiAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 text-emerald-400 font-mono-nums font-bold text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Start Month *
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all"
            >
              Generate EMI Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
