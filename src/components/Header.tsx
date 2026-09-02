import React from 'react';
import { 
  Plus, 
  Receipt, 
  ArrowDownToLine, 
  RotateCcw, 
  Layers
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface HeaderProps {
  onOpenAddLiability: () => void;
  onOpenAddExpense: () => void;
  onOpenExportImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddLiability,
  onOpenAddExpense,
  onOpenExportImport,
}) => {
  const { 
    selectedProfileId, 
    setSelectedProfileId, 
    profiles, 
    resetToDefaultData 
  } = useFinance();

  return (
    <header className="border-b border-white/[0.07] bg-[#090D16]/90 backdrop-blur-2xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand Mark & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
                <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  T
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white tracking-tight font-sans">Tenura</span>
                <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Ledger
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Credit Line, Loan & Amortization Management
              </p>
            </div>
          </div>

          {/* Profile Switcher Tabs */}
          <div className="flex items-center bg-[#0F1422] p-1 rounded-xl border border-white/[0.06] shadow-inner">
            <button
              onClick={() => setSelectedProfileId('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProfileId === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Consolidated</span>
            </button>

            {profiles.map(p => {
              const isActive = selectedProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {p.initials}
                  </span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={onOpenAddLiability}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all transform active:scale-95 border border-indigo-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Liability</span>
            </button>

            <button
              onClick={onOpenExportImport}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/[0.08] text-xs transition-colors"
              title="Backup, Export & Restore"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset data back to baseline Google Sheet state?')) {
                  resetToDefaultData();
                }
              }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/[0.08] text-xs transition-colors"
              title="Reset data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
