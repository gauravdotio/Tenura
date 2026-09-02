import React, { useState } from 'react';
import { X, Download, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({ isOpen, onClose }) => {
  const { exportDataJSON, importDataJSON, filteredLiabilities } = useFinance();
  const [jsonInput, setJsonInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!jsonInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste valid JSON backup content.' });
      return;
    }

    const success = importDataJSON(jsonInput.trim());
    if (success) {
      setStatusMessage({ type: 'success', text: 'Data successfully restored!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: 'Invalid JSON format or missing liabilities/schedules structure.' });
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
    link.setAttribute("download", `loans_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Backup, Export & Import</h3>
              <p className="text-xs text-gray-400">Export to CSV/JSON or restore data anytime</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Export Options */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Export Data
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportDataJSON}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-800 text-white text-xs font-semibold transition-all hover:border-indigo-500/40"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download JSON Backup</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-800 text-white text-xs font-semibold transition-all hover:border-emerald-500/40"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Export to CSV (Sheet)</span>
              </button>
            </div>
          </div>

          {/* Import JSON */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Import from JSON Backup
            </label>
            <textarea
              rows={4}
              placeholder="Paste JSON string here..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleImport}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Restore Backup</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/60 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
