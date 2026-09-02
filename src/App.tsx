import React, { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { LoansTable } from './components/LoansTable';
import { EMISchedulesGrid } from './components/EMISchedulesGrid';
import { ExpenseTracker } from './components/ExpenseTracker';
import { AnalyticsSection } from './components/AnalyticsSection';
import { AddLiabilityModal } from './components/AddLiabilityModal';
import { ConvertToEmiModal } from './components/ConvertToEmiModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ExportImportModal } from './components/ExportImportModal';
import type { Liability } from './types/finance';
import { 
  Layers, 
  BarChart3, 
  Receipt, 
  ShieldCheck,
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  // Modal states
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [selectedLiabilityForEmi, setSelectedLiabilityForEmi] = useState<Liability | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'expenses'>('dashboard');

  const scrollToSchedule = (liabilityId: string) => {
    setActiveTab('dashboard');
    setTimeout(() => {
      const element = document.getElementById(`schedule-${liabilityId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-cyan-500/50', 'ring-offset-2', 'ring-offset-[#080B11]');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-cyan-500/50', 'ring-offset-2', 'ring-offset-[#080B11]');
        }, 2000);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        onOpenAddLiability={() => setIsAddLiabilityOpen(true)}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Metric Cards */}
        <MetricsOverview />

        {/* View Navigation Switcher */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-[#0D111C]/90 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Liabilities & Schedules</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics & Forecasting</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Daily Expenses</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local Offline-First Vault</span>
            </span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-7 animate-fadeIn">
            <LoansTable
              onOpenAddLiability={() => setIsAddLiabilityOpen(true)}
              onOpenConvertToEmi={(liab) => setSelectedLiabilityForEmi(liab)}
              onScrollToSchedule={scrollToSchedule}
            />

            <EMISchedulesGrid />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fadeIn">
            <AnalyticsSection />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="animate-fadeIn">
            <ExpenseTracker onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#090D16] py-5 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400">Tenura — Sovereign Financial Control & Amortization Manager</span>
          </div>
          <p className="text-slate-400 text-[11px]">All data remains 100% on-device in client storage</p>
        </div>
      </footer>

      {/* Modals */}
      <AddLiabilityModal
        isOpen={isAddLiabilityOpen}
        onClose={() => setIsAddLiabilityOpen(false)}
      />

      <ConvertToEmiModal
        isOpen={!!selectedLiabilityForEmi}
        liability={selectedLiabilityForEmi}
        onClose={() => setSelectedLiabilityForEmi(null)}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
}

export default App;
