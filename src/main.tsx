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
import { ProductMediaProvider } from './contexts/ProductMediaContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProductMediaProvider><CartProvider>
            <App />
          </CartProvider></ProductMediaProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
