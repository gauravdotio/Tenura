import React, { useState, useEffect } from 'react';
import { X, Building2, CreditCard, Calendar, Calculator, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import type { Liability, LiabilityType, LiabilityStatus } from '../types/finance';
import { formatINR } from '../utils/formatters';

interface EditLiabilityModalProps {
  isOpen: boolean;
  liability: Liability | null;
  onClose: () => void;
}

export const EditLiabilityModal: React.FC<EditLiabilityModalProps> = ({ isOpen, liability, onClose }) => {
  if (!isOpen || !liability) return null;

  return (
    <EditLiabilityModalContent 
      key={`edit-${liability.id}`}
      liability={liability} 
      onClose={onClose} 
    />
  );
};

interface EditLiabilityModalContentProps {
  liability: Liability;
  onClose: () => void;
}

const EditLiabilityModalContent: React.FC<EditLiabilityModalContentProps> = ({ liability, onClose }) => {
  const { updateLiability, deleteLiability, profiles, triggerCelebration } = useFinance();

  const [profileId, setProfileId] = useState<string>(liability.profileId || profiles[0]?.id || 'gaurav');
  const [providerName, setProviderName] = useState<string>(liability.providerName || '');
  const [type, setType] = useState<LiabilityType>(liability.type || 'credit_card');
  const [status, setStatus] = useState<LiabilityStatus>(liability.status || 'active');
  const [amount, setAmount] = useState<string>(liability.amount ? liability.amount.toString() : '');
  const [emiAmount, setEmiAmount] = useState<string>(liability.emiAmount ? liability.emiAmount.toString() : '');
  const [tenure, setTenure] = useState<string>(liability.tenure ? liability.tenure.toString() : '');
  const [totalAmount, setTotalAmount] = useState<string>(
    liability.totalAmount 
      ? liability.totalAmount.toString() 
      : (liability.emiAmount && liability.tenure ? (liability.emiAmount * liability.tenure).toString() : (liability.amount?.toString() || ''))
  );
  const [startDate, setStartDate] = useState<string>(liability.startDate || new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState<string>(liability.notes || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTypeSelect = (newType: LiabilityType) => {
    setType(newType);
    if (newType === 'emi' || newType === 'bnpl') {
      const p = parseFloat(amount);
      const t = parseInt(tenure, 10);
      const e = parseFloat(emiAmount);
      if (!isNaN(t) && t > 0 && !isNaN(e) && e > 0) {
        setTotalAmount(Math.round(t * e).toString());
      } else if (!isNaN(p) && p > 0 && !isNaN(t) && t > 0) {
        const calcEmi = Math.round(p / t);
        setEmiAmount(calcEmi.toString());
        setTotalAmount(p.toString());
      } else if (!isNaN(p) && p > 0 && !totalAmount) {
        setTotalAmount(p.toString());
      }
    } else {
      if (amount && (!totalAmount || totalAmount === amount)) {
        setTotalAmount(amount);
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const p = parseFloat(val);
    const t = parseInt(tenure, 10);
    const e = parseFloat(emiAmount);

    if (!isNaN(p) && p > 0) {
      if (!isNaN(t) && t > 0) {
        if (!isNaN(e) && e > 0) {
          setTotalAmount(Math.round(t * e).toString());
        } else {
          const calcEmi = Math.round(p / t);
          setEmiAmount(calcEmi.toString());
          setTotalAmount(p.toString());
        }
      } else {
        if (!totalAmount || totalAmount === amount) {
          setTotalAmount(val);
        }
      }
    }
  };

  const handleTenureChange = (val: string) => {
    setTenure(val);
    const t = parseInt(val, 10);
    const p = parseFloat(amount);
    const e = parseFloat(emiAmount);

    if (!isNaN(t) && t > 0) {
      if (!isNaN(e) && e > 0) {
        setTotalAmount(Math.round(t * e).toString());
      } else if (!isNaN(p) && p > 0) {
        const calcEmi = Math.round(p / t);
        setEmiAmount(calcEmi.toString());
        setTotalAmount(p.toString());
      }
    }
  };

  const handleEmiChange = (val: string) => {
    setEmiAmount(val);
    const e = parseFloat(val);
    const t = parseInt(tenure, 10);

    if (!isNaN(e) && e > 0 && !isNaN(t) && t > 0) {
      setTotalAmount(Math.round(t * e).toString());
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    const tot = parseFloat(val);
    const t = parseInt(tenure, 10);

    if (!isNaN(tot) && tot > 0 && !isNaN(t) && t > 0) {
      setEmiAmount(Math.round(tot / t).toString());
    }
  };

  const handleCalculateEmi = () => {
    const p = parseFloat(amount);
    const t = parseInt(tenure, 10);
    if (!isNaN(p) && !isNaN(t) && t > 0) {
      const calculatedEmi = Math.round(p / t);
      setEmiAmount(calculatedEmi.toString());
      setTotalAmount(p.toString());
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim() || !amount) return;

    const numAmount = parseFloat(amount);
    const numEmi = emiAmount ? parseFloat(emiAmount) : undefined;
    const numTenure = tenure ? parseInt(tenure, 10) : undefined;
    const numTotal = totalAmount ? parseFloat(totalAmount) : (numEmi && numTenure ? numEmi * numTenure : numAmount);

    let statusNote = liability.statusNote;
    if (status === 'paid_off') {
      statusNote = 'Fully Settled 🎉';
      triggerCelebration();
    } else if (type === 'emi' || status === 'converted_to_emi') {
      statusNote = 'Active Consumer EMI';
    } else {
      statusNote = 'Active Card Balance';
    }

    updateLiability(liability.id, {
      profileId,
      providerName: providerName.trim(),
      type,
      status,
      statusNote,
      amount: numAmount,
      emiAmount: numEmi,
      tenure: numTenure,
      totalAmount: numTotal,
      startDate,
      hasSchedule: !!(numEmi && numTenure),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete record for ${providerName}? This will also delete any amortization schedules associated with it.`)) {
      deleteLiability(liability.id);
      onClose();
    }
  };

  const isScheduleType = type === 'emi' || type === 'bnpl' || status === 'converted_to_emi';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modalIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Edit Liability Details</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  {liability.id.slice(0, 8)}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Update amounts, provider, EMI schedules, and status
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {/* Target Profile / Holder */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Account / Holder
            </label>
            <div className="flex flex-wrap gap-2">
              {profiles.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProfileId(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    profileId === p.id 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold' 
                      : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold flex items-center justify-center">{p.initials}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Selection (Red = Debt, Blue = EMI, Green = Settled) */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Liability Lifecycle Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                  status === 'active'
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold'
                    : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Active Debt</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('converted_to_emi')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                  status === 'converted_to_emi'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-300 font-bold'
                    : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>In EMI Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('paid_off')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                  status === 'paid_off'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Settled (Wealth)</span>
              </button>
            </div>
          </div>

          {/* Instrument Type */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
                  onClick={() => handleTypeSelect(t.id as LiabilityType)}
                  className={`flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-medium transition-all ${
                    type === t.id 
                      ? 'bg-blue-600/15 border-blue-500/50 text-blue-300' 
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
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Provider / Institution *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cred cc pay loan, HDFC Bank, SBI Card"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Amount & Start Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Principal / Balance (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                placeholder="e.g. 110000"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pro-input w-full px-3.5 py-2 rounded-xl text-xs font-tabular font-bold text-rose-300"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
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
          {isScheduleType && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> Amortization Schedule Parameters
                </span>
                <button
                  type="button"
                  onClick={handleCalculateEmi}
                  className="text-[10px] text-cyan-400 hover:underline font-medium"
                >
                  Auto-divide
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tenure (Mo)</label>
                  <input
                    type="number"
                    placeholder="24"
                    min="1"
                    max="120"
                    value={tenure}
                    onChange={(e) => handleTenureChange(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Monthly EMI</label>
                  <input
                    type="number"
                    placeholder="5878"
                    value={emiAmount}
                    onChange={(e) => handleEmiChange(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular text-blue-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Total Payable</label>
                  <input
                    type="number"
                    placeholder="141072"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    className="pro-input w-full px-2.5 py-1.5 rounded-lg text-xs font-tabular font-bold text-cyan-300"
                  />
                </div>
              </div>

              {/* Dynamic Auto-calculated Summary Badge */}
              {tenure && emiAmount && parseInt(tenure, 10) > 0 && parseFloat(emiAmount) > 0 && (
                <div className="flex items-center justify-between text-[11px] pt-1 px-2.5 py-2 bg-blue-950/40 rounded-lg border border-blue-500/20">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    Auto-calc: <span className="font-semibold text-slate-100">{tenure} mo × {formatINR(parseFloat(emiAmount))}</span>
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-cyan-300">
                      = {formatINR(parseInt(tenure, 10) * parseFloat(emiAmount))}
                    </span>
                    {amount && parseFloat(amount) > 0 && (parseInt(tenure, 10) * parseFloat(emiAmount)) > parseFloat(amount) && (
                      <span className="text-amber-400 font-medium ml-1.5 text-[10px]">
                        (+{formatINR((parseInt(tenure, 10) * parseFloat(emiAmount)) - parseFloat(amount))} interest)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Internal Note / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Cred bill installment, personal remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="pro-input w-full px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
