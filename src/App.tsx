import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

// Layout & Shared UI
import RootLayout from './layouts/RootLayout';
import ErrorBoundary from './components/ErrorBoundary';
import type { InfoPageTab } from './pages/InfoPage';
import type { PolicyTab } from './pages/PoliciesPage';
import { RouteLoadingSkeleton } from './components/StorefrontSkeletons';
import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';

// Route-level code splitting for secondary routes so Home and Product pages never eagerly download Admin, Staff, Checkout, or Celebrations bundles — while keeping Home & PDP eager for zero CLS and instant LCP.
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));
const InfoPage = React.lazy(() => import('./pages/InfoPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const JournalPage = React.lazy(() => import('./pages/JournalPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const PoliciesPage = React.lazy(() => import('./pages/PoliciesPage'));
const AdminOrdersPage = React.lazy(() => import('./pages/AdminOrdersPage'));
const StaffOrdersWorkspace = React.lazy(() => import('./components/StaffOrdersWorkspace'));
const GiftRevealPage = React.lazy(() => import('./pages/GiftRevealPage'));
const OrderTrackingPage = React.lazy(() => import('./pages/OrderTrackingPage'));
const OfflinePage = React.lazy(() => import('./pages/OfflinePage'));
const PremiumHomePreviewPage = React.lazy(() => import('./pages/PremiumHomePreviewPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const OccasionsIndexRoute = React.lazy(() => import('./pages/CelebrationsPages').then(m => ({ default: m.OccasionsIndexRoute })));
const OccasionRoute = React.lazy(() => import('./pages/CelebrationsPages').then(m => ({ default: m.OccasionRoute })));
const PackagingHubPage = React.lazy(() => import('./pages/CelebrationsPages').then(m => ({ default: m.PackagingHubPage })));
const PackagingFormatPage = React.lazy(() => import('./pages/CelebrationsPages').then(m => ({ default: m.PackagingFormatPage })));
const DesignPage = React.lazy(() => import('./pages/CelebrationsPages').then(m => ({ default: m.DesignPage })));

const PageLoadingFallback = () => (
  <RouteLoadingSkeleton pathname={typeof window !== 'undefined' ? window.location.pathname : '/'} />
);

function InfoPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <InfoPage
      asPage={true}
      initialTab={(slug as InfoPageTab) || 'our-story'}
    />
  );
}

function PoliciesPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PoliciesPage
      asPage={true}
      initialTab={(slug as PolicyTab) || 'shipping'}
    />
  );
}

import LuxuryPreloader from './components/LuxuryPreloader';

export default function App() {
  return (
    <ErrorBoundary>
      <LuxuryPreloader />
      <BrowserRouter>
        <React.Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="shop/:category" element={<ShopPage />} />
              <Route path="category/:category" element={<ShopPage />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="success" element={<OrderSuccessPage />} />
              <Route path="pages/:slug" element={<InfoPageRoute />} />
              <Route path="pages" element={<InfoPage asPage={true} initialTab="our-story" />} />
              <Route path="policies/:slug" element={<PoliciesPageRoute />} />
              <Route path="policies" element={<PoliciesPage asPage={true} initialTab="shipping" />} />
              <Route path="journal" element={<JournalPage />} />
              <Route path="journal/:slug" element={<JournalPage />} />
              <Route path="story" element={<InfoPage asPage={true} initialTab="our-story" />} />
              <Route path="contact" element={<InfoPage asPage={true} initialTab="contact" />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="wholesale" element={<ShopPage />} />
              <Route path="gifting" element={<ShopPage />} />
              <Route path="occasions" element={<OccasionsIndexRoute />} />
              <Route path="occasions/:occasion" element={<OccasionRoute />} />
              <Route path="packaging" element={<PackagingHubPage />} />
              <Route path="packaging/:format" element={<PackagingFormatPage />} />
              <Route path="designs/:design" element={<DesignPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="admin/orders" element={<AdminOrdersPage />} />
              <Route path="staff/orders" element={<StaffOrdersWorkspace />} />
              <Route path="reveal/:token" element={<GiftRevealPage />} />
              <Route path="track" element={<OrderTrackingPage />} />
              <Route path="offline" element={<OfflinePage />} />
              <Route path="preview/premium-home" element={<PremiumHomePreviewPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
