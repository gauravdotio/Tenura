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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Convert to Installment Plan</h3>
              <p className="text-[11px] text-slate-400">{liability.providerName} (Bal: {formatINR(liability.amount)})</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#080B11] border border-white/[0.06] text-xs text-slate-300 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Outstanding Balance:</span>
              <span className="font-bold font-tabular text-white">{formatINR(liability.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Payable over Plan:</span>
              <span className="font-bold font-tabular text-cyan-400">{formatINR(totalCalculated)}</span>
            </div>
          </div>

          {/* Quick Tenure Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tenure Selection
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 9, 12].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setTenure(m)}
                  className={`py-2 rounded-xl border text-xs font-semibold font-tabular transition-all ${
                    tenure === m 
                      ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300' 
                      : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:bg-slate-800'
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
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Monthly EMI (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="2880"
                value={emiAmount}
                onChange={(e) => setEmiAmount(e.target.value)}
                className="pro-input w-full px-3 py-2 rounded-xl text-emerald-400 font-tabular font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Start Month *
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="pro-input w-full px-3 py-2 rounded-xl text-white text-xs"
              />
            </div>
          </div>

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
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm shadow-cyan-600/20 transition-all"
            >
              Generate Amortization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
