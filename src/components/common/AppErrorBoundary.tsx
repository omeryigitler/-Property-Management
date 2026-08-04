import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    error: null,
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application render failed:', error, info);
  }

  public render() {
    if (!this.state.error) {
      return (this as AppErrorBoundary & { props: React.PropsWithChildren }).props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-100">
        <section className="w-full max-w-xl rounded-2xl border border-rose-800 bg-slate-900 p-5 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-rose-700 bg-rose-950 p-2.5 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-black uppercase tracking-wide text-rose-200">
                Application could not start
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                The preview server is running, but the interface encountered a runtime error.
              </p>
            </div>
          </div>

          <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-rose-200">
            {this.state.error.message || String(this.state.error)}
          </pre>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white"
          >
            <RefreshCw className="h-4 w-4" /> Reload Preview
          </button>
        </section>
      </main>
    );
  }
}
