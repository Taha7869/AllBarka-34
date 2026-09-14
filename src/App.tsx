import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';

// Layout & Shared UI
import RootLayout from './layouts/RootLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Code-Split Route Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ShopPage = React.lazy(() => import('./pages/ShopPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));
const InfoPage = React.lazy(() => import('./pages/InfoPage'));
const FAQPage = React.lazy(() => import('./pages/FAQPage'));
const JournalPage = React.lazy(() => import('./pages/JournalPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const PoliciesPage = React.lazy(() => import('./pages/PoliciesPage'));
const AdminOrdersPage = React.lazy(() => import('./pages/AdminOrdersPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

import type { InfoPageTab } from './pages/InfoPage';
import type { PolicyTab } from './pages/PoliciesPage';

const PageLoadingFallback = () => (
  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center py-24" aria-busy="true">
    <div className="w-9 h-9 rounded-full border-2 border-[#D4AF6A]/25 border-t-[#D4AF6A] animate-spin" />
    <span className="mt-4 font-serif text-[11px] uppercase tracking-[0.25em] text-[#8C6B1B]/90 font-medium">
      AllBarka Luxury Dry Fruits
    </span>
  </div>
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

export default function App() {
  return (
    <ErrorBoundary>
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
              <Route path="cart" element={<CartPage />} />
              <Route path="admin/orders" element={<AdminOrdersPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
