'use client';

import { useState, useRef } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { parseCSV } from '@/lib/utils';
import { SignInLog } from '@/lib/types';

interface Props {
  onImport: (signIns: SignInLog[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function CSVImportModal({ onImport, isOpen, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setIsLoading(true);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      setIsLoading(false);
      return;
    }

    try {
      const content = await file.text();
      const signIns = parseCSV(content);
      onImport(signIns);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Import Sign-in Data</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Upload a CSV file exported from this dashboard to load sign-in data without authentication.
          </p>

          {/* File input */}
          <div className="flex flex-col gap-2">
            <label className="block">
              <div className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed
                              border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100
                              cursor-pointer transition-colors">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">Click to select CSV file</p>
                  <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">Expected CSV format:</p>
            <p>Download a CSV file from the dashboard using the export feature, then upload it here.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300
                       rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
