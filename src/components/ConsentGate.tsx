import React, { useEffect, useRef } from 'react';
import { useConsent } from '../contexts/ConsentContext';
import type { ConsentCategory } from '../lib/consent';

export interface ConsentGateProps {
  /** Required consent category before mounting children or running onGranted (e.g. 'analytics' | 'marketing'). */
  category: ConsentCategory;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  /** Runs once when consent for `category` is actively granted (e.g. inject GA4 or Meta Pixel script). */
  onGranted?: () => void;
}

/**
 * Safely injects an external script tag at most once by DOM id.
 * Intended to be called ONLY from ConsentGate's `onGranted` callback (e.g. Meta Pixel / Google Analytics).
 */
export function loadConsentScriptOnce(
  scriptId: string,
  src: string,
  attributes?: Record<string, string>
): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(scriptId);
  if (existing) return existing as HTMLScriptElement;
  const script = document.createElement('script');
  script.id = scriptId;
  script.src = src;
  script.async = true;
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      script.setAttribute(k, v);
    }
  }
  document.head.appendChild(script);
  return script;
}

/**
 * Gates optional analytics or marketing UI/scripts behind explicit user consent.
 * Respects GPC defaults and policy-version re-consent automatically via useConsent().
 */
export default function ConsentGate({ category, children = null, fallback = null, onGranted }: ConsentGateProps) {
  const { hasCategoryConsent } = useConsent();
  const allowed = hasCategoryConsent(category);
  const firedRef = useRef(false);

  useEffect(() => {
    if (allowed && !firedRef.current) {
      firedRef.current = true;
      onGranted?.();
    } else if (!allowed) {
      firedRef.current = false;
    }
  }, [allowed, onGranted]);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
