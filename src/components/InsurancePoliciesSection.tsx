import React, { useState } from 'react';
import { 
  Shield, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Landmark, 
  FileText
} from 'lucide-react';
import { formatINR } from '../utils/formatters';
import type { InsurancePolicy } from '../types/finance';

interface InsurancePoliciesSectionProps {
  onOpenAddPolicy?: () => void;
}

// Sample baseline policies for preview/structure
const INITIAL_DEMO_POLICIES: InsurancePolicy[] = [
  {
    id: 'pol-1',
    profileId: 'gaurav',
    providerName: 'LIC of India',
    policyName: 'LIC Jeevan Labh (Plan 936)',
    policyNumber: 'LIC-892341092',
    premiumAmount: 48500,
    premiumFrequency: 'yearly',
    sumAssured: 1200000,
    maturityDate: '2042-03-15',
    nextPremiumDate: '2027-03-15',
    status: 'active',
    notes: 'Endowment life assurance with guaranteed bonus & tax exemption u/s 80C',
  },
  {
    id: 'pol-2',
    profileId: 'gaurav',
    providerName: 'HDFC Life',
    policyName: 'Click 2 Protect Pure Term',
    policyNumber: 'HDFC-441092831',
    premiumAmount: 18200,
    premiumFrequency: 'yearly',
    sumAssured: 10000000,
    maturityDate: '2056-11-20',
    nextPremiumDate: '2026-11-20',
    status: 'active',
    notes: 'Pure protection term plan with critical illness & accidental rider',
  }
];

export const InsurancePoliciesSection: React.FC<InsurancePoliciesSectionProps> = () => {
  const [policies, setPolicies] = useState<InsurancePolicy[]>(INITIAL_DEMO_POLICIES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [providerName, setProviderName] = useState('LIC of India');
  const [policyName, setPolicyName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState<'yearly' | 'half_yearly' | 'quarterly' | 'monthly'>('yearly');
  const [sumAssured, setSumAssured] = useState('');
  const [nextPremiumDate, setNextPremiumDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');

  const totalSumAssured = policies.reduce((acc, p) => acc + (p.status === 'active' ? p.sumAssured : 0), 0);
  const totalAnnualPremiums = policies.reduce((acc, p) => {
    if (p.status !== 'active') return acc;
    const factor = p.premiumFrequency === 'yearly' ? 1 : p.premiumFrequency === 'half_yearly' ? 2 : p.premiumFrequency === 'quarterly' ? 4 : 12;
    return acc + (p.premiumAmount * factor);
  }, 0);

  const handleAddPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim() || !premiumAmount) return;

    const newPol: InsurancePolicy = {
      id: `pol-${Date.now()}`,
      profileId: 'gaurav',
      providerName: providerName.trim() || 'LIC of India',
      policyName: policyName.trim(),
      policyNumber: policyNumber.trim() || undefined,
      premiumAmount: Number(premiumAmount) || 0,
      premiumFrequency,
      sumAssured: Number(sumAssured) || 0,
      nextPremiumDate: nextPremiumDate || undefined,
      maturityDate: maturityDate || undefined,
      status: 'active',
      notes: notes.trim() || undefined,
    };

    setPolicies(prev => [newPol, ...prev]);
    setIsAddModalOpen(false);

    // Reset form
    setPolicyName('');
    setPolicyNumber('');
    setPremiumAmount('');
    setSumAssured('');
    setNotes('');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#0D121F]/90 border border-white/[0.08] backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Life Insurance & LIC Policies
              </h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Wealth Protection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track premium dues, maturity timelines, guaranteed sum assured, and policy numbers
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all active:scale-95 border border-emerald-400/20 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Policy / LIC Plan</span>
        </button>
      </div>

      {/* Top Insurance Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#0C1518] to-[#0A101A] border border-emerald-500/30 shadow-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Family Coverage</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-tabular">
            {formatINR(totalSumAssured)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Guaranteed Sum Assured across active plans</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-[#0B1322] to-[#0A101A] border border-blue-500/30 shadow-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Annual Premium Outflow</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 font-tabular">
            {formatINR(totalAnnualPremiums)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total annualized insurance commitments</div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-[#130E20] to-[#0A101A] border border-purple-500/30 shadow-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-purple-400" />
            <span>Active Policies</span>
          </div>
          <div className="text-2xl font-bold text-white font-tabular">
            {policies.length} Plans
          </div>
          <div className="text-[10px] text-slate-400 mt-1">All policies in active good standing</div>
        </div>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {policies.map(p => (
          <div 
            key={p.id}
            className="p-4 sm:p-5 rounded-2xl bg-[#0D121F]/90 border border-white/[0.08] hover:border-emerald-500/30 transition-all shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  {p.providerName}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white mt-1.5">{p.policyName}</h4>
                {p.policyNumber && (
                  <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span>No: {p.policyNumber}</span>
                  </p>
                )}
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Active</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Sum Assured</span>
                <span className="text-sm font-bold text-emerald-400 font-tabular">{formatINR(p.sumAssured)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Premium</span>
                <span className="text-sm font-bold text-white font-tabular">{formatINR(p.premiumAmount)} <span className="text-[10px] text-slate-400 font-normal">/{p.premiumFrequency}</span></span>
              </div>
            </div>

            {(p.nextPremiumDate || p.maturityDate) && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                {p.nextPremiumDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>Next Due: <strong className="text-slate-200">{p.nextPremiumDate}</strong></span>
                  </span>
                )}
                {p.maturityDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>Matures: <strong className="text-slate-200">{p.maturityDate}</strong></span>
                  </span>
                )}
              </div>
            )}

            {p.notes && (
              <p className="text-[11px] text-slate-400 bg-white/[0.015] p-2.5 rounded-xl border border-white/[0.04]">
                {p.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Policy Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0D121F] border border-white/[0.1] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Add New Life / LIC Policy</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPolicy} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Provider / Insurer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LIC of India, HDFC Life"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Policy / Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LIC Jeevan Labh, Tech Term"
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Policy Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 892341092"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sum Assured (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000000"
                    value={sumAssured}
                    onChange={(e) => setSumAssured(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Premium Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Frequency</label>
                  <select
                    value={premiumFrequency}
                    onChange={(e: any) => setPremiumFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="half_yearly">Half Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Next Premium Due Date</label>
                  <input
                    type="date"
                    value={nextPremiumDate}
                    onChange={(e) => setNextPremiumDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Maturity Date (Optional)</label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Benefits</label>
                <input
                  type="text"
                  placeholder="e.g. Accidental death benefit rider included"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
