import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, Home, Sparkles } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AllBarka boutique error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[340px] flex flex-col items-center justify-center p-8 sm:p-12 bg-[#FAF9F5] dark:bg-[#120F17] border border-[#D4AF37]/35 rounded-[28px] m-4 sm:m-8 text-center shadow-md relative overflow-hidden select-none"
        >
          {/* Subtle gold decorative glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Luxury Brand Icon */}
          <div className="w-16 h-16 rounded-full bg-[#043327]/10 dark:bg-[#043327]/40 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-5 shadow-sm">
            <Sparkles size={28} />
          </div>

          <span className="inline-block px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8C6B1B] dark:text-[#D4AF37] mb-3">
            AllBarka Boutique Care
          </span>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#120F17] dark:text-[#FAF9F5] mb-2">
            A Momentary Interruption
          </h2>

          <p className="text-xs sm:text-sm text-[#4A4540] dark:text-[#C5BFB5] max-w-md mx-auto mb-6 leading-relaxed">
            Our boutique collection encountered a momentary display interruption. Your cart and stored selections remain secure.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-6 py-3 min-h-[44px] rounded-full bg-[#043327] hover:bg-[#03251C] text-[#FAF9F5] text-xs font-bold uppercase tracking-wider border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all shadow-sm flex items-center gap-2 cursor-pointer focus-ring"
            >
              <RefreshCcw size={14} className="text-[#D4AF37]" />
              <span>Refresh Boutique</span>
            </button>

            <a
              href="/"
              className="px-6 py-3 min-h-[44px] rounded-full bg-white/80 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[#120F17] dark:text-[#FAF9F5] text-xs font-medium uppercase tracking-wider border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 transition-all flex items-center gap-2 focus-ring"
            >
              <Home size={14} className="text-[#8C6B1B] dark:text-[#D4AF37]" />
              <span>Return to Table</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
