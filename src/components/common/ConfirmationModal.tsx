import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';

export function ConfirmationModal() {
  const confirmationModal = useDashboardStore((s) => s.confirmationModal);
  const closeConfirmation = useDashboardStore((s) => s.closeConfirmation);

  if (!confirmationModal || !confirmationModal.isOpen) return null;

  const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', onConfirm } = confirmationModal;

  const handleConfirm = () => {
    onConfirm();
    closeConfirmation();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-4">
        <button
          type="button"
          onClick={closeConfirmation}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-xl flex-shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1 pr-6">
            <h3 className="text-lg font-bold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={closeConfirmation}
            className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 text-sm font-medium hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
