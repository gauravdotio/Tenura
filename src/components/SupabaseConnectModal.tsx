import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials } from '../lib/supabase';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({ isOpen, onClose }) => {
  const currentCredentials = getSupabaseCredentials();

  const [url, setUrl] = useState(currentCredentials.url || '');
  const [anonKey, setAnonKey] = useState(currentCredentials.anonKey || '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim().startsWith('http')) {
      setError('Please enter a valid Supabase URL starting with https://');
      return;
    }
    if (!anonKey.trim()) {
      setError('Please enter your Supabase Anon API key');
      return;
    }

    saveSupabaseCredentials(url, anonKey);
    onClose();
  };

  const handleCopySchemaCommand = () => {
    setCopied(true);
    navigator.clipboard.writeText(`-- View the complete SQL script in supabase_schema.sql in your Tenura project root`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0D121F] border border-white/[0.1] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Connect Real Supabase Cloud</span>
                {currentCredentials.isConfigured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Live
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Store live real data in PostgreSQL with cloud authentication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3 Step Quick Setup Guide */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quick 2-minute setup:</span>
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
            <li>
              Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a> and create a free project.
            </li>
            <li>
              Go to <strong>Project Settings → API</strong> and copy your <strong>Project URL</strong> and <strong>Anon Key</strong> below.
            </li>
            <li className="flex items-center flex-wrap gap-1">
              <span>In Supabase, click <strong>SQL Editor → New Query</strong>, paste <span className="text-indigo-300 font-mono">supabase_schema.sql</span>, and click <strong>Run</strong>.</span>
              <button
                type="button"
                onClick={handleCopySchemaCommand}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium transition-all"
              >
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copied ? 'Copied!' : 'Copy info'}</span>
              </button>
            </li>
          </ol>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzabcdefg.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Anon / Public API Key *
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-white text-xs sm:text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            {currentCredentials.isConfigured ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Disconnect from Supabase and revert to offline local mode?')) {
                    clearSupabaseCredentials();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted on client</span>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-white/[0.08]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
