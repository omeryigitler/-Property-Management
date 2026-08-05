import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';

export function ToastContainer() {
  const toasts = useDashboardStore((state) => state.toasts);
  const removeToast = useDashboardStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[110] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px] sm:items-stretch sm:px-0">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#1f8a63]" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-[#c83f45]" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#a66a17]" />
          ) : (
            <Info className="h-5 w-5 flex-shrink-0 text-[#285f7d]" />
          );

        const surfaceClass =
          toast.type === 'success'
            ? 'border-[#b9ddcf] bg-[#f1faf6]'
            : toast.type === 'error'
              ? 'border-[#efc3c0] bg-[#fff3f2]'
              : toast.type === 'warning'
                ? 'border-[#ecd6aa] bg-[#fff8ea]'
                : 'border-[#c6ddeb] bg-[#f2f8fc]';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-[680px] items-start justify-between gap-3 rounded-2xl border p-3.5 text-[#272321] shadow-[0_14px_40px_rgba(45,32,28,0.16)] backdrop-blur-md transition-all animate-slide-up sm:max-w-none ${surfaceClass}`}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="pt-0.5">{icon}</div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-tight">
                  {toast.title}
                </span>
                {toast.message && (
                  <span className="mt-1 block text-xs font-medium leading-snug text-[#6f6864]">
                    {toast.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5">
              {toast.undoAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undoAction?.();
                    removeToast(toast.id);
                  }}
                  className="flex h-9 items-center gap-1 rounded-lg border border-[#e4c98f] bg-white px-2.5 text-xs font-bold text-[#8a5a14] transition-colors hover:bg-[#fff7e8]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Undo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#817873] transition-colors hover:bg-white/70 hover:text-[#272321]"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
