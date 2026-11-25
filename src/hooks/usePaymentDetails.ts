import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/apiUrl';
import { sanitizePaymentDetails, type PublicPaymentDetails } from '../lib/paymentDetails';

const CLIENT_CACHE_MS = 5 * 60_000;

let cachedDetails: { at: number; value: PublicPaymentDetails | null } | null = null;
let inflight: Promise<PublicPaymentDetails | null> | null = null;

export function resetClientPaymentDetailsCache(): void {
  cachedDetails = null;
  inflight = null;
}

async function fetchPaymentDetails(): Promise<PublicPaymentDetails | null> {
  if (cachedDetails && Date.now() - cachedDetails.at < CLIENT_CACHE_MS) {
    return cachedDetails.value;
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(apiUrl('/api/payment-details'), {
            signal: controller.signal,
            credentials: 'omit',
            cache: 'no-store',
          });
          if (!response.ok) return null;
          const payload = await response.json();
          const sanitized = sanitizePaymentDetails(payload?.details);
          cachedDetails = { at: Date.now(), value: sanitized };
          return sanitized;
        } finally {
          clearTimeout(timer);
        }
      } catch {
        return null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

export function usePaymentDetails(initialDetails?: PublicPaymentDetails | null): {
  details: PublicPaymentDetails | null;
  loading: boolean;
} {
  const hasInitial = initialDetails !== undefined;
  const [details, setDetails] = useState<PublicPaymentDetails | null>(() => {
    if (hasInitial) return sanitizePaymentDetails(initialDetails);
    if (cachedDetails && Date.now() - cachedDetails.at < CLIENT_CACHE_MS) {
      return cachedDetails.value;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (hasInitial) return false;
    return !(cachedDetails && Date.now() - cachedDetails.at < CLIENT_CACHE_MS);
  });

  useEffect(() => {
    if (hasInitial) {
      setDetails(sanitizePaymentDetails(initialDetails));
      setLoading(false);
      return;
    }
    let active = true;
    void fetchPaymentDetails().then((resolved) => {
      if (!active) return;
      setDetails(resolved);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [hasInitial, initialDetails]);

  return { details, loading };
}
