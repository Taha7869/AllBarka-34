import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { routeMetadata } from '../lib/routeMetadata';
import { trackCommerce } from '../lib/analytics';

export function useRouteExperience() {
  const location = useLocation(); const { language, t } = useLanguage(); const previousPath = useRef(location.pathname);
  useEffect(() => {
    const track = () => { void trackCommerce('page_view', { path: location.pathname + location.search, language }); };
    track(); window.addEventListener('allbarka-measurement-ready', track); window.addEventListener('allbarka-measurement-changed', track);
    return () => { window.removeEventListener('allbarka-measurement-ready', track); window.removeEventListener('allbarka-measurement-changed', track); };
  }, [location.pathname, location.search, language]);
  useEffect(() => {
    const changed = previousPath.current !== location.pathname; previousPath.current = location.pathname;
    if (!changed) return;
    const main = document.getElementById('main-content'); if (!main) return;
    const focus = () => {
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return false;
      const heading = main.querySelector<HTMLElement>('h1'); if (!heading) return false;
      heading.tabIndex = -1; heading.focus({ preventScroll: true }); return true;
    };
    if (focus()) return;
    const observer = new MutationObserver(() => { if (focus()) observer.disconnect(); }); observer.observe(main, { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), 5000); return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [location.pathname]);
  return t(routeMetadata(location.pathname + location.search).labelKey);
}
