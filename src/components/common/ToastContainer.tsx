import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';

export function ToastContainer() {
  const toasts = useDashboardStore((s) => s.toasts);
  const removeToast = useDashboardStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[110] flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          );

        const borderClass =
          toast.type === 'success'
            ? 'border-emerald-800/80 bg-slate-900/95 text-slate-100'
            : toast.type === 'error'
            ? 'border-rose-800/80 bg-slate-900/95 text-slate-100'
            : toast.type === 'warning'
            ? 'border-amber-800/80 bg-slate-900/95 text-slate-100'
            : 'border-cyan-800/80 bg-slate-900/95 text-slate-100';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-slide-up ${borderClass}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="pt-0.5">{icon}</div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold leading-tight">{toast.title}</span>
                {toast.message && <span className="text-xs text-slate-300 leading-snug">{toast.message}</span>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {toast.undoAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undoAction?.();
                    removeToast(toast.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-xs font-semibold border border-amber-700/80 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
