import React, { useState } from 'react';
import { 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  KeyRound,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { users, login, register } = useAuth();
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  
  // Default to Gaurav Rawat
  const gauravUser = users.find(u => u.name.toLowerCase().includes('gaurav')) || users[0];

  // Sign In form fields
  const [accountOrEmail, setAccountOrEmail] = useState(gauravUser?.name || 'Gaurav Rawat');
  const [password, setPassword] = useState('');

  // Sign Up form fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const targetAccount = accountOrEmail.trim() || gauravUser?.name || 'Gaurav Rawat';
    const res = await login(targetAccount, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Password mismatch');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    setIsLoading(true);
    const res = await register({
      name: signupName.trim(),
      email: signupEmail.trim(),
      pin: signupPassword.trim() || undefined,
      startEmpty: true,
    });
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Could not create account');
    } else {
      setSuccessMessage(`Welcome to Tenura, ${signupName}!`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background radial ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/[0.08] rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-12 right-12 w-[380px] h-[380px] bg-emerald-600/[0.05] rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[400px] relative z-10 space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 p-[1px] shadow-xl shadow-blue-500/20 mb-1">
            <div className="w-full h-full bg-[#090D15] rounded-[15px] flex items-center justify-center">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                T
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tenura
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Wealth intelligence & liability management
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="rounded-2xl bg-[#0C101A]/90 border border-white/[0.08] backdrop-blur-2xl shadow-2xl p-6 space-y-4">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#07090F] rounded-xl border border-white/[0.05] text-xs font-semibold">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white/[0.09] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>

            <button
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white/[0.09] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                  Account Name or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Gaurav Rawat"
                    value={accountOrEmail}
                    onChange={(e) => setAccountOrEmail(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#080B13] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#080B13] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5 animate-fadeIn">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Gaurav Rawat"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#080B13] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="gaurav@domain.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#080B13] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#080B13] border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/70 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

        </div>

        {/* Minimal Clean Footer */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
          <span>Privacy</span>
          <span>•</span>
          <span>Security</span>
          <span>•</span>
          <span>Tenura</span>
        </div>

      </div>
    </div>
  );
};
