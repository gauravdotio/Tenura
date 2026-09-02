import React, { useState } from 'react';
import { X, Building2, CreditCard, Calendar, Calculator, ShieldCheck } from 'lucide-react';
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
    setProviderName('');
    setAmount('');
    setEmiAmount('');
    setTenure('');
    setTotalAmount('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Record Liability or Credit Line</h3>
              <p className="text-[11px] text-slate-400">Add credit card balance, bank loan, or consumer EMI</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          
          {/* Target Profile */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Account / Holder
            </label>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    profileId === p.id 
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300' 
                      : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold flex items-center justify-center">{p.initials}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Instrument Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Instrument Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
                { id: 'emi', label: 'EMI Plan', icon: Calendar },
                { id: 'bnpl', label: 'Term Loan / BNPL', icon: ShieldCheck },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as LiabilityType)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    type === t.id 
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300' 
                      : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Provider / Institution *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IndusInd Bank CC, SBI Card, HDFC Consumer EMI"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Amount & Start Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Principal / Balance (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                placeholder="e.g. 30000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs font-tabular font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Start Month
              </label>
              <input
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Optional EMI Parameters */}
          {(type === 'emi' || type === 'bnpl') && (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> Amortization Schedule Parameters
                </span>
                <button
                  type="button"
                  onClick={handleCalculateEmi}
                  className="text-[10px] text-cyan-400 hover:underline font-medium"
                >
                  Auto-divide Amount
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tenure (Mo)</label>
                  <input
                    type="number"
                    placeholder="12"
                    min="1"
                    max="120"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Monthly EMI (₹)</label>
                  <input
                    type="number"
                    placeholder="2331"
                    value={emiAmount}
                    onChange={(e) => setEmiAmount(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Total Payable (₹)</label>
                  <input
                    type="number"
                    placeholder="27972"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Internal Note / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. 1.5 Ton Inverter AC purchase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            />
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              Save Record
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
