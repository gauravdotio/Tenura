import React, { useState, useEffect } from 'react';
import { X, UserPlus, Sparkles, Check, Wallet } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  { name: 'Emerald', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Cyan', value: '#06B6D4', bg: 'bg-cyan-500' },
  { name: 'Rose', value: '#F43F5E', bg: 'bg-rose-500' },
  { name: 'Amber', value: '#F59E0B', bg: 'bg-amber-500' },
];

const PRESET_ROLES = [
  'Secondary Account',
  'Spouse',
  'Family Member',
  'Business Entity',
  'Savings / Investment',
];

export const AddProfileModal: React.FC<AddProfileModalProps> = ({ isOpen, onClose }) => {
  const { addProfile } = useFinance();

  const [name, setName] = useState('');
  const [role, setRole] = useState(PRESET_ROLES[0]);
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value);
  const [monthlyBudget, setMonthlyBudget] = useState('75000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Auto-generate initials
  const initials = name
    .trim()
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'U';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await addProfile({
        name: name.trim(),
        initials,
        role: role.trim() || 'Secondary Account',
        accentColor,
        monthlyBudget: parseFloat(monthlyBudget) || 75000,
      });
      onClose();
      // Reset form
      setName('');
      setRole(PRESET_ROLES[0]);
      setMonthlyBudget('75000');
    } catch (err) {
      console.error('Failed to add profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden flex flex-col animate-modalIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add New Account Holder</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Create a segregated ledger for a user or family member
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {name.trim() || 'New Account Holder'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{role}</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
              Auto-saved
            </span>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Account / Holder Full Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Priya Rawat, Business Corp, Savings Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pro-input w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder:text-slate-500"
            />
          </div>

          {/* Role Presets */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Role Classification
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROLES.map(r => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    role === r
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-semibold'
                      : 'bg-slate-900/80 border-white/[0.06] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Palette */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {ACCENT_COLORS.map(c => (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setAccentColor(c.value)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${c.bg} ${
                    accentColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0E121E] scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.name}
                >
                  {accentColor === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Budget */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Monthly Budget Target (₹)
            </label>
            <div className="relative">
              <Wallet className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                min="0"
                step="500"
                placeholder="75000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="pro-input w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-tabular"
              />
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Once added, this account opens with a fresh, blank ledger ready for liabilities, credit lines, and EMIs. All records remain auto-saved and restored upon signing back in.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
