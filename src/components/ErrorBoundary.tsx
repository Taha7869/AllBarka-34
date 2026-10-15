import { useLanguage } from '../contexts/LanguageContext';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if ((this as any).props.fallback) {
        return (this as any).props.fallback;
      }
      return <ErrorFallback />;
    }

    return (this as any).props.children;
  }
}

export function ErrorFallback() {
  const { t, isRtl } = useLanguage();
  return <section role="alert" dir={isRtl ? 'rtl' : 'ltr'} className="m-4 flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-[var(--color-ink)]"><AlertTriangle aria-hidden="true" className="mb-4 text-[var(--color-accent-text)]" size={32} /><h2 className="font-serif text-xl">{t('experience.error.title')}</h2><p className="my-4 max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">{t('experience.error.body')}</p><button type="button" onClick={() => window.location.reload()} className="focus-ring flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm text-[var(--color-primary-fg)]"><RefreshCcw size={16} aria-hidden="true" />{t('experience.error.reload')}</button></section>;
}
export default ErrorBoundary;
