import './styles/premium-content.css';
import {StorefrontContentProvider} from './contexts/StorefrontContentContext';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/boutique.css';
import './styles/catalog-filters.css';
import './styles/visual-refinements.css';
import './styles/circular-carousel.css';
import './styles/store-updates.css';
import './styles/luminous.css';
import './styles/editorial.css';
import './styles/selection-guide.css';
import './components/AllBarkaHero.css';
import { ProductMediaProvider } from './contexts/ProductMediaContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import { CatalogProvider } from './contexts/CatalogContext';
import { MerchandisingProvider } from './contexts/MerchandisingContext';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    try {
      const reloadKey = 'allbarka_vite_preload_reload';
      if (window.sessionStorage.getItem(reloadKey) !== '1') {
        window.sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CatalogProvider><MerchandisingProvider><ProductMediaProvider><CartProvider>
            <StorefrontContentProvider><App /></StorefrontContentProvider>
          </CartProvider></ProductMediaProvider></MerchandisingProvider></CatalogProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
