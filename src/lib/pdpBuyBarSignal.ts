import { useEffect, useState } from 'react';

/**
 * The product page's sticky buy bar and the site-wide cart bar share the bottom of a phone screen.
 * The product page announces when its bar is showing, so the layout hides the cart bar and lifts the
 * chat and back-to-top buttons instead of stacking three things on top of each other.
 */
export const PDP_BUY_BAR_EVENT = 'allbarka:pdp-buy-bar';
let current = false;

export function setPdpBuyBarVisible(visible: boolean) {
  if (current === visible || typeof window === 'undefined') return;
  current = visible;
  window.dispatchEvent(new CustomEvent(PDP_BUY_BAR_EVENT, { detail: visible }));
}

export function usePdpBuyBarVisible(): boolean {
  const [visible, setVisible] = useState(current);
  useEffect(() => {
    const onChange = (event: Event) => setVisible(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener(PDP_BUY_BAR_EVENT, onChange);
    setVisible(current);
    return () => window.removeEventListener(PDP_BUY_BAR_EVENT, onChange);
  }, []);
  return visible;
}
