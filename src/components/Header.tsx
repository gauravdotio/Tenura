import React from 'react';
import { 
  Wallet, 
  Users, 
  PlusCircle, 
  Receipt, 
  Download, 
  RotateCcw, 
  Sparkles
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
    <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-glow-indigo">
              <div className="w-full h-full bg-gray-950 rounded-[11px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Tenura</h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Synced
                </span>
              </div>
              <p className="text-xs text-gray-400">Smart Loans, Credit Cards & EMI Amortization Manager</p>
            </div>
          </div>

          {/* Profile Switcher Tabs */}
          <div className="flex items-center bg-gray-900/90 p-1 rounded-xl border border-gray-800 shadow-inner">
            <button
              onClick={() => setSelectedProfileId('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedProfileId === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All (Household)</span>
            </button>

            {profiles.map(p => {
              const isActive = selectedProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <span className="text-sm">{p.avatar}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 text-xs font-medium transition-all"
              title="Log general day-to-day expense"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Expense</span>
            </button>

            <button
              onClick={onOpenAddLiability}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold shadow-glow-indigo transition-all transform active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Loan / CC</span>
            </button>

            <button
              onClick={onOpenExportImport}
              className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 text-xs transition-colors"
              title="Backup & Restore (JSON / CSV)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset data back to the original Google Sheet state?')) {
                  resetToDefaultData();
                }
              }}
              className="p-1.5 rounded-xl bg-gray-900 hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-gray-800 text-xs transition-colors"
              title="Reset to initial Sheet data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
