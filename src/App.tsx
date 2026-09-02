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
  LayoutDashboard, 
  LineChart, 
  ReceiptText, 
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
        element.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-gray-950');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-gray-950');
        }, 2000);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-900/90 p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Loans & EMI Schedules</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>Analytics & Burndown</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'expenses'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Daily Expenses</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Encrypted Local Storage</span>
            </span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* 1. Master Loans & Credit Cards Table (Google Sheet Top Section) */}
            <LoansTable
              onOpenAddLiability={() => setIsAddLiabilityOpen(true)}
              onOpenConvertToEmi={(liab) => setSelectedLiabilityForEmi(liab)}
              onScrollToSchedule={scrollToSchedule}
            />

            {/* 2. EMI Breakdown & Amortization Schedules (Google Sheet Bottom Section) */}
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
      <footer className="border-t border-gray-850 bg-gray-950/60 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Personal Loan & EMI Tracker • Pre-populated with your Google Sheet data</span>
          </div>
          <p className="text-gray-400">Data stored locally on your device in your active workspace</p>
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
