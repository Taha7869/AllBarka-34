export const PWA_DISMISSED_KEY = 'allbarka_pwa_dismissed';
export const IOS_A2HS_DISMISSED_KEY = 'allbarka_ios_a2hs_dismissed';

export interface StandaloneCheckEnv {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { standalone?: boolean };
}

/** Returns true when running as an installed PWA (standalone / minimal-ui display mode or iOS standalone). */
export function isStandaloneDisplayMode(env?: StandaloneCheckEnv | null): boolean {
  const win = env !== undefined ? env : typeof window !== 'undefined' ? (window as unknown as StandaloneCheckEnv) : null;
  if (!win) return false;
  try {
    if (win.navigator?.standalone === true) return true;
    if (typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    return false;
  }
  return false;
}

export interface IosSafariEnv {
  userAgent?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  matchMedia?: (query: string) => { matches: boolean };
}

/**
 * Returns true ONLY on iOS / iPadOS Safari when NOT already installed as a standalone PWA.
 * Excludes Chrome (CriOS), Firefox (FxiOS), Opera (OPiOS), Edge (EdgiOS), DuckDuckGo, and Google app.
 */
export function isIosSafari(env?: IosSafariEnv | null): boolean {
  const nav =
    env !== undefined
      ? env
      : typeof navigator !== 'undefined'
        ? {
            userAgent: navigator.userAgent,
            maxTouchPoints: navigator.maxTouchPoints,
            standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
            matchMedia: typeof window !== 'undefined' ? window.matchMedia.bind(window) : undefined,
          }
        : null;
  if (!nav) return false;
  if (isStandaloneDisplayMode({ matchMedia: nav.matchMedia, navigator: { standalone: nav.standalone } })) {
    return false;
  }
  const ua = String(nav.userAgent || '');
  const isIosDevice =
    /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && Number(nav.maxTouchPoints || 0) > 1);
  if (!isIosDevice) return false;
  const hasSafari = /Safari/i.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS|YaBrowser|DuckDuckGo|GSA/i.test(ua);
  return hasSafari && !isOtherBrowser;
}

export interface SharePayload {
  title: string;
  text?: string;
  url: string;
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'manual';

export interface ShareEnv {
  share?: (data: SharePayload) => Promise<void>;
  clipboard?: { writeText?: (text: string) => Promise<void> };
  execCopy?: (text: string) => boolean;
}

/**
 * Shares a product link via the Web Share API when available, falling back smoothly
 * to Clipboard API (or execCommand copy) so every desktop and mobile browser gets instant feedback.
 */
export async function shareProductLink(payload: SharePayload, env?: ShareEnv): Promise<ShareOutcome> {
  const nav =
    env !== undefined
      ? env
      : typeof navigator !== 'undefined'
        ? {
            share: typeof navigator.share === 'function' ? navigator.share.bind(navigator) : undefined,
            clipboard: navigator.clipboard,
          }
        : {};

  if (typeof nav.share === 'function') {
    try {
      await nav.share(payload);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to copy link if Web Share fails or is unsupported in this context
    }
  }

  if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(payload.url);
      return 'copied';
    } catch {
      // Fall through to execCopy fallback
    }
  }

  if (typeof env?.execCopy === 'function') {
    return env.execCopy(payload.url) ? 'copied' : 'manual';
  }

  if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = payload.url;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) return 'copied';
    } catch {
      // Fall through to manual
    }
  }

  return 'manual';
}
