import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary, ErrorBoundaryFallback } from '../src/components/ErrorBoundary';
import NotFoundPage from '../src/pages/NotFoundPage';
import { LanguageProvider, type LanguageCode } from '../src/contexts/LanguageContext';

interface TestableProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  initialError?: Error;
  onReset?: () => void;
}

class TestableErrorBoundary extends React.Component<TestableProps, { hasError: boolean; error: Error | null }> {
  public state = {
    hasError: !!this.props.initialError,
    error: this.props.initialError || null,
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorBoundaryFallback onReset={this.props.onReset || (() => {})} />;
    }
    return this.props.children;
  }
}

test('ErrorBoundary: renders children normally when no error occurs', () => {
  const html = renderToString(
    <LanguageProvider>
      <ErrorBoundary>
        <div data-testid="healthy-content">Healthy Boutique Content</div>
      </ErrorBoundary>
    </LanguageProvider>
  );

  assert.ok(html.includes('Healthy Boutique Content'));
  assert.ok(!html.includes('role="alert"'));
});

test('ErrorBoundary: renders localized luxury fallback view when hasError is true', () => {
  const html = renderToString(
    <LanguageProvider>
      <TestableErrorBoundary initialError={new Error('Simulated boutique display error')}>
        <div>Should not be rendered</div>
      </TestableErrorBoundary>
    </LanguageProvider>
  );

  // Verify accessible role and brand tokens
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('aria-live="assertive"'));
  assert.ok(html.includes('AllBarka Boutique Care'));
  assert.ok(html.includes('A Momentary Interruption'));
  assert.ok(html.includes('Refresh Boutique'));
  assert.ok(html.includes('Return to Table'));

  // Verify absence of unsupported security guarantees
  assert.ok(
    !html.includes('remain secure'),
    'Must avoid unsupported assurance that stored selections remain secure'
  );
});

test('ErrorBoundary: renders custom fallback prop when supplied', () => {
  const html = renderToString(
    <LanguageProvider>
      <TestableErrorBoundary
        initialError={new Error('Simulated failure')}
        fallback={<div data-testid="custom-fallback">Custom Boutique Fallback</div>}
      >
        <div>Should not be rendered</div>
      </TestableErrorBoundary>
    </LanguageProvider>
  );

  assert.ok(html.includes('Custom Boutique Fallback'));
  assert.ok(!html.includes('A Momentary Interruption'));
});

test('ErrorBoundaryFallback: renders localized Urdu and Arabic with RTL direction', () => {
  // Urdu RTL
  const urduHtml = renderToString(
    <LanguageProvider initialLanguage="ur">
      <ErrorBoundaryFallback onReset={() => {}} />
    </LanguageProvider>
  );
  assert.ok(urduHtml.includes('dir="rtl"'));
  assert.ok(urduHtml.includes('آلبرکہ بوتیک نگہداشت'));
  assert.ok(urduHtml.includes('عارضی رکاوٹ'));
  assert.ok(urduHtml.includes('صفحہ ریفریش کریں'));
  assert.ok(urduHtml.includes('مرکزی صفحہ'));

  // Arabic RTL
  const arabicHtml = renderToString(
    <LanguageProvider initialLanguage="ar">
      <ErrorBoundaryFallback onReset={() => {}} />
    </LanguageProvider>
  );
  assert.ok(arabicHtml.includes('dir="rtl"'));
  assert.ok(arabicHtml.includes('عناية متجر البركة'));
  assert.ok(arabicHtml.includes('انقطاع مؤقت'));
  assert.ok(arabicHtml.includes('تحديث المتجر'));
  assert.ok(arabicHtml.includes('العودة للرئيسية'));
});

test('ErrorBoundaryFallback: safe fallback behavior outside LanguageProvider', () => {
  // Render without wrapping in LanguageProvider - must not throw and must use safe defaults
  const html = renderToString(<ErrorBoundaryFallback onReset={() => {}} />);

  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('dir="ltr"'));
  assert.ok(html.includes('AllBarka Boutique Care'));
  assert.ok(html.includes('A Momentary Interruption'));
});

test('NotFoundPage: renders branded 404 with navigation links in EN, UR, and AR', () => {
  // English
  const enHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(enHtml.includes('Harvest Path Not Found'));
  assert.ok(enHtml.includes('404'));
  assert.ok(enHtml.includes('Page Not Found'));
  assert.ok(enHtml.includes('href="/shop"'));
  assert.ok(enHtml.includes('href="/"'));
  assert.ok(enHtml.includes('focus-ring'));

  // Urdu
  const urHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="ur">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(urHtml.includes('dir="rtl"'));
  assert.ok(urHtml.includes('صفحہ دستیاب نہیں ہے'));
  assert.ok(urHtml.includes('آپ کا مطلوبہ صفحہ یا کلیکشن دستیاب نہیں ہے۔'));

  // Arabic
  const arHtml = renderToString(
    <MemoryRouter>
      <LanguageProvider initialLanguage="ar">
        <NotFoundPage />
      </LanguageProvider>
    </MemoryRouter>
  );
  assert.ok(arHtml.includes('dir="rtl"'));
  assert.ok(arHtml.includes('الصفحة غير موجودة'));
  assert.ok(arHtml.includes('الصفحة أو التشكيلة التي تبحث عنها لم تعد متوفرة حالياً.'));
});
