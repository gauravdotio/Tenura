import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Calculator, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  CalendarClock, 
  Sparkles, 
  Lock, 
  Users, 
  Receipt, 
  Shield, 
  Zap, 
  ChevronDown, 
  KeyRound, 
  Check 
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  // Interactive Hero Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(150000);
  const [calcTenure, setCalcTenure] = useState<number>(24);
  const [calcRate, setCalcRate] = useState<number>(14);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Calculate live values
  const { emi, totalPayable, totalInterest } = useMemo(() => {
    const P = calcAmount;
    const r = calcRate / (12 * 100);
    const n = calcTenure;

    if (r === 0) {
      const e = Math.round(P / n);
      return { emi: e, totalPayable: P, totalInterest: 0 };
    }

    const emiCalc = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const total = emiCalc * n;
    const interest = total - P;
    return { emi: emiCalc, totalPayable: total, totalInterest: interest };
  }, [calcAmount, calcTenure, calcRate]);

  const faqs = [
    {
      q: "What makes Tenura different from regular budgeting apps?",
      a: "Most budgeting apps only track past transactions. Tenura is an amortization-first sovereign ledger. It specifically models liabilities, credit cards, and consumer EMIs as structured countdown schedules, mapping out your exact path to zero debt while accumulating verified settled wealth."
    },
    {
      q: "Is my financial data kept private and secure?",
      a: "Yes, completely. Tenura utilizes a dual-layer sovereign architecture: your records are securely encrypted and can run purely from your private browser vault or sync directly to your personal Supabase PostgreSQL database. No advertising networks, no data brokering."
    },
    {
      q: "Can I manage multiple accounts or family members?",
      a: "Absolutely. With Tenura's Multi-Account architecture, you can create separate, dedicated ledgers for yourself, your spouse, family members, or business entities, while retaining an aggregated 'All Accounts' master view."
    },
    {
      q: "How does the Total Payable auto-calculation work?",
      a: "Whenever you record or edit a liability, entering the Tenure and Monthly EMI automatically computes the total amount payable including interest and bank fees. Modifying any parameter updates the whole schedule dynamically."
    },
    {
      q: "Can I track Insurance policies and LIC renewals?",
      a: "Yes! Tenura includes a dedicated Insurance & LIC module to monitor policy numbers, renewal frequencies, premium amounts, sum assured, and upcoming grace-period dates."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-blue-600/[0.12] via-indigo-600/[0.06] to-transparent rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[800px] -left-48 w-[500px] h-[500px] bg-rose-600/[0.05] rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-[1400px] -right-48 w-[600px] h-[600px] bg-emerald-600/[0.05] rounded-full blur-[160px] pointer-events-none"></div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#07090E]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 p-[1px] shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-[#0A0E17] rounded-[11px] flex items-center justify-center">
                <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                  T
                </span>
              </div>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight">Tenura</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold ml-2 border-l border-white/10 pl-2 hidden xs:inline">
                Sovereign Ledger
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
            <a href="#calculator" className="hover:text-white transition-colors">Amortization</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onSignIn}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-medium animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Sovereign Financial Operating System</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Master Every Loan, EMI & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Transform Debt into Wealth.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto font-normal">
            Tenura is the high-precision financial manager engineered for ambitious individuals and households. Auto-calculate amortization, track monthly commitments, and eliminate debt with mathematical certainty.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 border border-blue-400/30"
            >
              <span>Launch Your Ledger Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onSignIn}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-white/[0.09] flex items-center justify-center gap-2 transition-all"
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              <span>Sign In to Vault</span>
            </button>
          </div>

          {/* Trust Metrics Pill */}
          <div className="pt-4 flex items-center justify-center gap-6 sm:gap-8 text-[11px] sm:text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Client-Side Privacy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Amortization</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Supabase Cloud Backup</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Hero Amortization Card */}
        <div id="calculator" className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-[#0F1424] to-[#0A0D17] border border-white/[0.1] shadow-2xl p-5 sm:p-8 backdrop-blur-2xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
            Interactive Amortization Simulator
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-2">
            {/* Controls */}
            <div className="lg:col-span-7 space-y-5">
              {/* Slider 1: Loan Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Principal / Loan Amount</span>
                  <span className="text-white font-bold font-tabular text-sm">{formatINR(calcAmount)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="1000000"
                  step="10000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>₹20,000</span>
                  <span>₹5,00,000</span>
                  <span>₹10,00,000</span>
                </div>
              </div>

              {/* Slider 2: Tenure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Tenure Duration</span>
                  <span className="text-blue-300 font-bold font-tabular text-sm">{calcTenure} Months</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="48"
                  step="1"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>3 mo</span>
                  <span>12 mo</span>
                  <span>24 mo</span>
                  <span>48 mo</span>
                </div>
              </div>

              {/* Slider 3: Interest Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Interest Rate (p.a.)</span>
                  <span className="text-rose-300 font-bold font-tabular text-sm">{calcRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="0.5"
                  value={calcRate}
                  onChange={(e) => setCalcRate(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (No-cost EMI)</span>
                  <span>12%</span>
                  <span>24%</span>
                </div>
              </div>
            </div>

            {/* Live Computed Results Showcase */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-blue-950/40 border border-blue-500/20 p-5 space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Calculated Monthly Outflow</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-bold text-[10px]">
                  {calcTenure} Installments
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-tabular">
                  {formatINR(emi)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ month</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Payable:</span>
                  <span className="font-bold text-white font-tabular">{formatINR(totalPayable)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Interest / Charge:</span>
                  <span className="font-bold text-rose-400 font-tabular">+{formatINR(totalInterest)}</span>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <span>Track This in Tenura</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The 3-Color Philosophy Section */}
      <section id="philosophy" className="py-16 sm:py-24 border-y border-white/[0.06] bg-[#0A0E18]/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Tri-Color Visual Framework
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Tenura eliminates confusing spreadsheets by anchoring your financial reality in three unmistakable, psychologically proven colors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Green: Wealth */}
            <div className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-emerald-950/30 via-[#0B1417] to-slate-900/60 border border-emerald-500/30 shadow-xl space-y-4 hover:border-emerald-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Green Tier</span>
                <h3 className="text-lg font-bold text-white mt-1">Accumulated Wealth & Settled Debt</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every settled EMI, repaid card bill, and cleared loan automatically converts into your net-worth tally. Visualizing paid debt as newly liberated capital reinforces financial discipline.
              </p>
            </div>

            {/* Red: Debt */}
            <div className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-rose-950/30 via-[#170E12] to-slate-900/60 border border-rose-500/30 shadow-xl space-y-4 hover:border-rose-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Red Tier</span>
                <h3 className="text-lg font-bold text-white mt-1">Active Debt & Credit Lines</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                A stark, uncompromised view of every outstanding obligation. Track total card balances, interest drag, and bank obligations without sugarcoating reality.
              </p>
            </div>

            {/* Blue: Amortization */}
            <div className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-blue-950/30 via-[#0C1220] to-slate-900/60 border border-blue-500/30 shadow-xl space-y-4 hover:border-blue-500/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Blue Tier</span>
                <h3 className="text-lg font-bold text-white mt-1">Amortization & Installment Countdown</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your month-by-month execution roadmap. See upcoming EMI debits, track exactly how many installments remain, and watch your debt balance count down to zero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered for Total Sovereignty
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Everything you need to orchestrate household liabilities, eliminate surprises, and build permanent peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Dynamic Total Payable Auto-Calc</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never manually calculate EMI totals. Enter tenure and quoted EMI to instantly uncover total payable sums, interest breakdowns, and amortized schedules.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Multi-Account & Family Segregation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add individual sub-accounts for spouse, family members, or business entities with a single click. Keep separate ledgers or view consolidated balances.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Daily Outflow & Expense Tracker</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log daily living expenses categorized by Food, Utilities, Transport, and Shopping. Compare real-time spend against your monthly target budget.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Insurance & LIC Policy Safeguard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Protect your safety net. Track policy numbers, premium dates, sum assured, and payment frequencies so coverage never lapses.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Convert Card Balances into EMIs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Simulate or execute converting rotating credit card debt into structured installment plans with a single click, saving thousands in finance charges.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl p-6 bg-[#0D1222] border border-white/[0.08] shadow-lg space-y-3 hover:border-white/[0.16] transition-all">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Dual-Vault Supabase Resilience</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your data lives synchronously in your browser storage and automatically backs up to your Supabase PostgreSQL cloud database. Zero data loss.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-20 border-t border-white/[0.06] bg-[#0A0D16]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white">
              Why Traditional Tools Fall Short
            </h2>
            <p className="text-xs text-slate-400">See how Tenura compares to spreadsheets and banking apps</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Excel / Sheets</th>
                  <th className="py-3 px-4">Banking Apps</th>
                  <th className="py-3 px-4 text-blue-400 font-bold">Tenura Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Amortization Countdown Schedules</td>
                  <td className="py-3 px-4 text-slate-500">Requires complex formulas</td>
                  <td className="py-3 px-4 text-rose-400">No</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Built-in Auto-calc</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Cross-Bank Consolidated View</td>
                  <td className="py-3 px-4 text-slate-400">Manual data entry</td>
                  <td className="py-3 px-4 text-rose-400">Only their own bank</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> All Cards & Banks</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Household Multi-Account Separation</td>
                  <td className="py-3 px-4 text-slate-500">Messy multi-tabs</td>
                  <td className="py-3 px-4 text-rose-400">Single user only</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 1-Click Segregated Profiles</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Privacy & Ad-Free Experience</td>
                  <td className="py-3 px-4 text-emerald-400">Private</td>
                  <td className="py-3 px-4 text-rose-400">Targeted loan ads</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 100% Private, Zero Ads</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">Everything you need to know about Tenura</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="rounded-2xl bg-[#0D1222] border border-white/[0.08] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-blue-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/[0.04] pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-blue-950/60 via-[#0F1424] to-emerald-950/40 border border-blue-500/30 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Begin Your Journey to Zero Debt Today
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              No credit card required. Experience sovereign control over your amortization and wealth right now.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/30 inline-flex items-center gap-2 transition-all active:scale-95"
            >
              <span>Get Started with Tenura</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#05070B] py-8 sm:py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              T
            </div>
            <span className="font-bold text-white text-sm">Tenura</span>
            <span className="text-slate-500 text-[11px]">— Sovereign Wealth & Amortization Manager</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
            <a href="#calculator" className="hover:text-white transition-colors">Amortization</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <button onClick={onSignIn} className="text-blue-400 hover:underline">Vault Sign In</button>
          </div>

          <p className="text-[10px] text-slate-500">
            Encrypted Financial Management © 2026. Private & Confidential.
          </p>
        </div>
      </footer>
    </div>
  );
};
