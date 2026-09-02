import React, { useState } from 'react';
import { X, Building2, CreditCard, Calendar, Calculator, Sparkles } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { LiabilityType } from '../types/finance';

interface AddLiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddLiabilityModal: React.FC<AddLiabilityModalProps> = ({ isOpen, onClose }) => {
  const { addLiability, profiles, selectedProfileId } = useFinance();

  const [profileId, setProfileId] = useState<string>(
    selectedProfileId === 'all' ? (profiles[0]?.id || 'gaurav') : selectedProfileId
  );
  const [providerName, setProviderName] = useState<string>('');
  const [type, setType] = useState<LiabilityType>('credit_card');
  const [amount, setAmount] = useState<string>('');
  const [emiAmount, setEmiAmount] = useState<string>('');
  const [tenure, setTenure] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  // Helper to auto-calculate monthly EMI if principal and tenure are entered
  const handleCalculateEmi = () => {
    const p = parseFloat(amount);
    const t = parseInt(tenure, 10);
    if (!isNaN(p) && !isNaN(t) && t > 0) {
      const calculatedEmi = Math.round(p / t);
      setEmiAmount(calculatedEmi.toString());
      setTotalAmount(p.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !amount) return;

    const numAmount = parseFloat(amount);
    const numEmi = emiAmount ? parseFloat(emiAmount) : undefined;
    const numTenure = tenure ? parseInt(tenure, 10) : undefined;
    const numTotal = totalAmount ? parseFloat(totalAmount) : (numEmi && numTenure ? numEmi * numTenure : numAmount);

    addLiability({
      profileId,
      providerName: providerName.trim(),
      type,
      amount: numAmount,
      status: 'active',
      statusNote: type === 'emi' ? 'Active Consumer EMI' : 'Active Card Balance',
      emiAmount: numEmi,
      tenure: numTenure,
      totalAmount: numTotal,
      startDate,
      hasSchedule: !!(numEmi && numTenure),
      notes: notes.trim() || undefined,
    });

    onClose();
    // Reset form
    setProviderName('');
    setAmount('');
    setEmiAmount('');
    setTenure('');
    setTotalAmount('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add Loan / Credit Card / EMI</h3>
              <p className="text-xs text-gray-400">Add a new financial liability to your tracking sheet</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          
          {/* Profile Target */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Account / Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    profileId === p.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                      : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <span>{p.avatar}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Liability Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Type of Liability
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                { id: 'emi', label: 'EMI / Loan', icon: Calendar },
                { id: 'bnpl', label: 'BNPL / Other', icon: Sparkles },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as LiabilityType)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    type === t.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                      : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Provider Name / Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Indus Bank CC, SBI Bank CC, AC EMI, Personal Loan"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Amount / Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Amount / Principal (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                placeholder="e.g. 30000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono-nums text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Start Month
              </label>
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional EMI Parameters */}
          {(type === 'emi' || type === 'bnpl') && (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> EMI Schedule Generator
                </span>
                <button
                  type="button"
                  onClick={handleCalculateEmi}
                  className="text-[11px] text-cyan-400 hover:underline font-medium"
                >
                  Auto-calculate EMI
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Tenure (Mo)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12"
                    min="1"
                    max="120"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-white font-mono-nums text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2331"
                    value={emiAmount}
                    onChange={(e) => setEmiAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-emerald-400 font-mono-nums text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Total Payable (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 27972"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-white font-mono-nums text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 1.5 Ton Inverter AC purchase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
            />
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-glow-indigo transition-all"
            >
              Save Liability
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
