import React from 'react';
import { X, History, Clock } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { formatReadableDate } from '../../utils/dateUtilities';

export function ActivityHistoryModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const closeModal = useDashboardStore((s) => s.closeModal);
  const history = useDashboardStore((s) => s.activityHistory);

  if (activeModal !== 'history') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[85dvh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Audit Activity Log</h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No activity recorded yet.</div>
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
                : record.action.includes('updated')
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                : 'bg-amber-950 text-amber-300 border-amber-800';

              return (
                <div
                  key={record.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                      {record.action.replace(/_/g, ' ')}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">{record.entity}</span>
                      <span className="text-xs text-slate-400">{record.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-shrink-0 self-end sm:self-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatReadableDate(dateStr)} {timeStr}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
