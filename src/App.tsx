import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { LoansTable } from './components/LoansTable';
import { EMISchedulesGrid } from './components/EMISchedulesGrid';
import { ExpenseTracker } from './components/ExpenseTracker';
import { InsurancePoliciesSection } from './components/InsurancePoliciesSection';
import { AnalyticsSection } from './components/AnalyticsSection';
import { AddLiabilityModal } from './components/AddLiabilityModal';
import { EditLiabilityModal } from './components/EditLiabilityModal';
import { ConvertToEmiModal } from './components/ConvertToEmiModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { ExportImportModal } from './components/ExportImportModal';
import type { Liability } from './types/finance';
import { 
  Layers, 
  BarChart3, 
  Receipt, 
  ShieldCheck,
  Shield,
  CalendarClock,
  Sparkles,
  Plus
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { filteredLiabilities, loadDemoData } = useFinance();
  const { currentUser } = useAuth();

  // Modal states
  const [isAddLiabilityOpen, setIsAddLiabilityOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [selectedLiabilityForEmi, setSelectedLiabilityForEmi] = useState<Liability | null>(null);
  const [selectedLiabilityForEdit, setSelectedLiabilityForEdit] = useState<Liability | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'expenses' | 'insurance' | 'analytics'>('dashboard');

  const scrollToSchedule = useCallback((liabilityId: string) => {
    setActiveTab('schedules');
    requestAnimationFrame(() => {
      setTimeout(() => {
        const element = document.getElementById(`schedule-${liabilityId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500/60', 'ring-offset-2', 'ring-offset-[#080B11]');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500/60', 'ring-offset-2', 'ring-offset-[#080B11]');
          }, 2000);
        }
      }, 50);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        onOpenAddLiability={() => setIsAddLiabilityOpen(true)}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Clean Onboarding Prompt for Fresh Accounts */}
        {filteredLiabilities.length === 0 && (
          <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-blue-950/40 via-[#0D1222] to-emerald-950/30 border border-blue-500/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Welcome to Tenura, {currentUser?.name || 'User'}!
                </h3>
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Your portfolio is currently clean with zero outstanding liabilities. Add your credit cards, loans, or EMIs to start building your ledger.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
              <button
                onClick={() => setIsAddLiabilityOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Liability</span>
              </button>
              <button
                onClick={loadDemoData}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all"
              >
                Load Sample Data
              </button>
            </div>
          </div>
        )}

        {/* Top Red / Green / Blue Metric Cards */}
        <MetricsOverview />

        {/* View Navigation Switcher */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 sm:pb-3 gap-3">
          <div className="flex items-center overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0D121F]/90 p-1 rounded-xl border border-white/[0.06] text-xs flex-shrink-0">
              
              {/* Tab 1: Liabilities & Cards (Red theme) */}
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Liabilities & Cards</span>
              </button>

              {/* Tab 2: EMI Schedules (Blue theme) */}
              <button
                onClick={() => setActiveTab('schedules')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'schedules'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>EMI Schedules</span>
              </button>

              {/* Tab 3: Daily Expenses */}
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'expenses'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Expenses</span>
              </button>

              {/* Tab 4: Insurance & LIC Policies (Green theme) */}
              <button
                onClick={() => setActiveTab('insurance')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'insurance'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Insurance & LIC</span>
              </button>

              {/* Tab 5: Analytics */}
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted Ledger</span>
            </span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-fadeIn">
            <LoansTable
              onOpenAddLiability={() => setIsAddLiabilityOpen(true)}
              onOpenConvertToEmi={(liab) => setSelectedLiabilityForEmi(liab)}
              onOpenEditLiability={(liab) => setSelectedLiabilityForEdit(liab)}
              onScrollToSchedule={scrollToSchedule}
            />
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="animate-fadeIn">
            <EMISchedulesGrid />
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="animate-fadeIn">
            <ExpenseTracker onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          </div>
        )}

        {activeTab === 'insurance' && (
          <div className="animate-fadeIn">
            <InsurancePoliciesSection />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fadeIn">
            <AnalyticsSection />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#090D16] py-4 sm:py-5 text-center text-xs text-slate-400 mt-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400 text-[11px] sm:text-xs">Tenura — Sovereign Financial Control & Amortization Manager</span>
          </div>
          <p className="text-slate-500 text-[10px] sm:text-[11px]">
            Private & Encrypted Financial Management © 2026
          </p>
        </div>
      </footer>

      {/* Modals */}
      <AddLiabilityModal
        isOpen={isAddLiabilityOpen}
        onClose={() => setIsAddLiabilityOpen(false)}
      />

      <EditLiabilityModal
        isOpen={!!selectedLiabilityForEdit}
        liability={selectedLiabilityForEdit}
        onClose={() => setSelectedLiabilityForEdit(null)}
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

const AppRoot: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [unauthView, setUnauthView] = useState<'landing' | 'signin' | 'signup'>('landing');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080B11] flex items-center justify-center text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Loading your vault...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (unauthView === 'landing') {
      return (
        <LandingPage 
          onGetStarted={() => setUnauthView('signup')} 
          onSignIn={() => setUnauthView('signin')} 
        />
      );
    }
    return (
      <LoginPage 
        initialMode={unauthView === 'signup' ? 'signup' : 'signin'} 
        onBackToLanding={() => setUnauthView('landing')} 
      />
    );
  }

  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}

export default App;
