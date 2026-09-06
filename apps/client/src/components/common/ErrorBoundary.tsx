import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Something went wrong</h2>
                <p className="text-xs text-slate-400">An unexpected application exception occurred.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-mono text-rose-300">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Application
              </button>

              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                {this.state.showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Details
              </button>
            </div>

            {this.state.showDetails && this.state.errorInfo && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto max-h-48 text-[11px] font-mono text-slate-400">
                <pre>{this.state.errorInfo.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
