import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Receipt, 
  ArrowDownToLine, 
  Layers,
  LogOut,
  Users,
  ChevronDown,
  ShieldCheck,
  Globe,
  X
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { AddProfileModal } from './AddProfileModal';

interface HeaderProps {
  onOpenAddLiability: () => void;
  onOpenAddExpense: () => void;
  onOpenExportImport: () => void;
  onViewLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddLiability,
  onOpenAddExpense,
  onOpenExportImport,
  onViewLanding,
}) => {
  const { 
    selectedProfileId, 
    setSelectedProfileId, 
    profiles, 
    deleteProfile,
    exportDataJSON
  } = useFinance();

  const { currentUser, logout, users, instantLogin } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('')
    : 'U';

  return (
    <header className="border-b border-white/[0.08] bg-[#090D16]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          
          {/* Top Bar: Brand & Mobile Actions */}
          <div className="flex items-center justify-between gap-3">
            {/* Brand Mark & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-emerald-500 p-[1px] shadow-lg shadow-blue-500/20 flex-shrink-0">
                <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
                  <span className="font-extrabold text-xs sm:text-sm tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                    T
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">Tenura</span>
                  <span className="text-[10px] font-medium tracking-wide text-slate-400 border-l border-white/10 pl-2 hidden xs:inline">
                    Wealth & Credit
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 md:hidden">
              {onViewLanding && (
                <button
                  onClick={onViewLanding}
                  className="p-2 rounded-xl bg-blue-500/10 text-blue-300 hover:text-white border border-blue-500/25 text-xs transition-colors"
                  title="View Landing Page"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onOpenAddExpense}
                className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-white/[0.08] text-xs transition-colors"
                title="Log Expense"
              >
                <Receipt className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={onOpenAddLiability}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 active:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all border border-rose-400/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>

              {/* Mobile User Avatar Trigger */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentUser?.avatarColor || 'from-blue-500 to-emerald-500'} flex items-center justify-center text-white text-xs font-bold border border-white/20 shadow-md`}
                >
                  {userInitials}
                </button>
              </div>
            </div>
          </div>

          {/* Member Profile Switcher (Consolidated / Personal sub-profiles) */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <div className="flex items-center bg-[#0F1422] p-1 rounded-xl border border-white/[0.06] shadow-inner space-x-1 flex-shrink-0">
              <button
                onClick={() => setSelectedProfileId('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedProfileId === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Accounts</span>
              </button>

              {profiles.map((p, idx) => {
                const isActive = selectedProfileId === p.id;
                const isSecondary = idx > 0;
                return (
                  <div key={p.id} className="relative group/pill flex items-center">
                    <button
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
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
                    {isSecondary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete secondary account "${p.name}"? Any records will be consolidated into your primary account.`)) {
                            deleteProfile(p.id);
                          }
                        }}
                        className="opacity-0 group-hover/pill:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-md transition-all -ml-1 mr-0.5"
                        title={`Delete account ${p.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Account / User Plus Button */}
              <button
                type="button"
                onClick={() => setIsAddProfileOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-dashed border-white/20 hover:border-emerald-500/40 transition-all active:scale-95"
                title="Add New Account Holder / User"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-[11px] font-semibold">New Account</span>
              </button>
            </div>
          </div>

          {/* Desktop Actions & User Session Control */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {onViewLanding && (
              <button
                onClick={onViewLanding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white border border-blue-500/25 text-xs font-medium transition-all"
                title="View Product Landing Page & Overview"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Landing Page</span>
              </button>
            )}

            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-400" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={onOpenAddLiability}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-all active:scale-95 border border-rose-400/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Liability</span>
            </button>

            <button
              onClick={onOpenExportImport}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/[0.08] text-xs transition-colors"
              title="Backup & Restore"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>

            {/* User Account Menu Dropdown on Desktop */}
            <div className="relative ml-1" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/[0.08] text-xs font-medium text-slate-200 transition-all"
              >
                <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${currentUser?.avatarColor || 'from-blue-500 to-emerald-500'} flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                  {userInitials}
                </div>
                <span className="font-semibold">{currentUser?.name || 'Account'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D121F] border border-white/[0.1] shadow-2xl backdrop-blur-xl py-2 z-50 animate-fadeIn">
                  
                  {/* Current User Info */}
                  <div className="px-4 py-2.5 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400 font-medium">Logged in</p>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Secured</span>
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  </div>

                  {/* Switch to Another User */}
                  {users.length > 1 && (
                    <div className="px-2 py-1.5 border-b border-white/[0.06]">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span>Switch Profile</span>
                      </div>

                      <div className="space-y-0.5">
                        {users.map(u => {
                          const isCurrent = u.id === currentUser?.id;
                          return (
                            <button
                              key={u.id}
                              disabled={isCurrent}
                              onClick={async () => {
                                await instantLogin(u);
                                setIsUserMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                isCurrent 
                                  ? 'bg-blue-600/15 text-blue-300 font-semibold cursor-default'
                                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              <span className="truncate">{u.name}</span>
                              {isCurrent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Production User Utilities */}
                  <div className="px-2 py-1.5 border-b border-white/[0.06] space-y-0.5 text-xs">
                    {onViewLanding && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onViewLanding();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>Landing Page & Overview</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        exportDataJSON();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-white/[0.05] transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download Statement Backup</span>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="px-2 pt-1.5">
                    <button
                      onClick={async () => {
                        await logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Mobile User Dropdown Modal/Card when open */}
      {isUserMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0B0F19] px-4 py-3 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <p className="text-xs font-bold text-white">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
            </div>
            <button
              onClick={async () => {
                await logout();
                setIsUserMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-1 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted Session</span>
            </span>
            <button
              onClick={() => {
                exportDataJSON();
                setIsUserMenuOpen(false);
              }}
              className="text-xs text-blue-400 underline"
            >
              Export Backup
            </button>
          </div>
        </div>
      )}

      {/* Add Account Holder / User Modal */}
      <AddProfileModal
        isOpen={isAddProfileOpen}
        onClose={() => setIsAddProfileOpen(false)}
      />
    </header>
  );
};
