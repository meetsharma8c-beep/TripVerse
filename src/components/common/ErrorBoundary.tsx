import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by TripVerse ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToHome = () => {
    try {
      window.location.href = window.location.origin;
    } catch {
      window.location.reload();
    }
  };

  private handleHardReset = () => {
    if (confirm('This will refresh TripVerse and reset temporary session cache. Your saved trips will remain intact. Continue?')) {
      try {
        sessionStorage.clear();
        localStorage.removeItem('tripverse_active_trip_id');
      } catch (e) {
        console.error(e);
      }
      window.location.href = window.location.origin;
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700 p-8 shadow-2xl space-y-6 text-center">
            
            {/* Shield Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Safe Journey Shield
              </span>
              <h1 className="text-2xl font-black font-display text-white tracking-tight">
                TripVerse Encountered a Bump
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                We've safely isolated an unexpected display glitch. Your itineraries and travel data remain safe and sound.
              </p>
            </div>

            {/* Error Message Snippet */}
            {this.state.error && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 text-left">
                <p className="text-[11px] font-mono text-rose-300 truncate">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-trip-gradient text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:brightness-110 active:scale-98 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleResetToHome}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Return Home</span>
                </button>

                <button
                  onClick={this.handleHardReset}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Cache</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold">TripVerse AI Engine</span>
              <span>Need help? support@tripverse.ai</span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
