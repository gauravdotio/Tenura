import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, ArrowUpToLine, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ isOpen, onClose }) => {
  const { exportDataJSON, importDataJSON, filteredLiabilities } = useFinance();
  const [jsonInput, setJsonInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!jsonInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide valid JSON backup payload.' });
      return;
    }

    const success = importDataJSON(jsonInput.trim());
    if (success) {
      setStatusMessage({ type: 'success', text: 'Financial database successfully restored.' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMessage({ type: 'error', text: 'Invalid schema or corrupted JSON backup format.' });
    }
  };

  const handleExportCSV = () => {
    const headers = ["Provider Name", "Type", "Amount", "Status", "Monthly EMI", "Tenure", "Total Amount"];
    const rows = filteredLiabilities.map(l => [
      `"${l.providerName}"`,
      `"${l.type}"`,
      l.amount,
      `"${l.statusNote || l.status}"`,
      l.emiAmount || '',
      l.tenure || '',
      l.totalAmount || l.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tenura_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0E121E] border border-white/[0.09] shadow-2xl overflow-hidden animate-modalIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#090D16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Database Backup & Spreadsheet Export</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Export structured CSV/JSON archives or restore records</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 max-h-[82vh] overflow-y-auto smooth-scroll">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300' 
                : 'bg-rose-950/60 border border-rose-800/60 text-rose-300'
            }`}>
              {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Export Archive
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                onClick={exportDataJSON}
                className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-white/[0.08] text-white text-xs font-semibold transition-all hover:border-indigo-500/40"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON Snapshot</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-white/[0.08] text-white text-xs font-semibold transition-all hover:border-emerald-500/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Spreadsheet (CSV)</span>
              </button>
            </div>
          </div>

          {/* Import JSON */}
          <div className="space-y-2">
            <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Import from JSON Snapshot
            </label>
            <textarea
              rows={4}
              placeholder="Paste valid JSON snapshot here..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="pro-input w-full px-3 py-2 rounded-xl text-white font-tabular text-xs"
            />
            <button
              onClick={handleImport}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
              <span>Restore Database</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#090D16] border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
