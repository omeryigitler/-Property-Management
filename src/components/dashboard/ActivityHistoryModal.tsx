import React from 'react';
import { X, History, Clock, ArrowLeft } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { formatReadableDate } from '../../utils/dateUtilities';

export function ActivityHistoryModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const history = useDashboardStore((state) => state.activityHistory);

  if (activeModal !== 'history') return null;

  const returnToSettings = Boolean(modalParams.returnToSettings);
  const handleClose = () => {
    if (returnToSettings) {
      openModal('settings', { section: modalParams.returnSection || 'data' });
    } else {
      closeModal();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-700/90">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 sm:text-lg">Audit Activity Log</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            {returnToSettings ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-6">
          {history.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No activity recorded yet.</div>
          ) : (
            history.map((record) => {
              const timeStr = new Date(record.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = record.timestamp.slice(0, 10);
              const badgeColor = record.action.includes('created')
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : record.action.includes('deleted')
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : record.action.includes('updated') || record.action.includes('saved')
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800';

              return (
                <div
                  key={record.id}
                  className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex-shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                      {record.action.replace(/_/g, ' ')}
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-200">{record.entity}</span>
                      <span className="block text-xs text-slate-400">{record.description}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1.5 self-end text-[11px] text-slate-500 sm:self-auto">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatReadableDate(dateStr)} {timeStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:w-auto"
          >
            {returnToSettings && <ArrowLeft className="h-3.5 w-3.5" />}
            {returnToSettings ? 'Back to Settings' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
