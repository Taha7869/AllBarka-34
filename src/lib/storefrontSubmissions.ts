import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';

interface SubmissionOptions { timeoutMs?: number; signal?: AbortSignal; headers?: Record<string, string>; }
interface InquiryInput { name: string; contact: string; topic: string; message: string; }

export interface CustomQuoteSubmissionInput {
  submissionKey?: string;
  productId: string;
  productName: string;
  packagingVariant?: string;
  boxMode: 'empty' | 'filled' | 'custom';
  quantity: number;
  eventType: string;
  targetEventDate?: string;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrinting?: string;
  budgetType?: 'per_piece' | 'total';
  targetPricePkr?: number | null;
  referenceUnitPrice?: number | null;
  customerName: string;
  customerPhone: string;
  email?: string;
  city: string;
  leadTimeNoticeAcknowledged?: boolean;
}

export interface CustomQuoteSubmissionResult {
  quoteId: string;
  whatsappUrl: string;
  message?: string;
  inquiry?: Record<string, unknown>;
}

async function submitForm(path: string, body: unknown, options: SubmissionOptions): Promise<Record<string, unknown>> {
  return withApiDeadline(async signal => {
    const response = await fetch(apiUrl(path), {
      method: 'POST', signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || (data?.success !== true && data?.ok !== true) || typeof data !== 'object' || Array.isArray(data)) {
      const err = new Error(data?.message || data?.error || 'SUBMISSION_UNCONFIRMED');
      (err as any).code = data?.code || data?.error || 'SUBMISSION_UNCONFIRMED';
      (err as any).status = response.status;
      throw err;
    }
    return data;
  }, options.timeoutMs ?? 12000, options.signal);
}

/** A receipt comes from the saved inquiry; connection failures never manufacture a ticket. */
export async function submitBoutiqueInquiry(input: InquiryInput, options: SubmissionOptions = {}): Promise<{ ticketId: string; message?: string }> {
  const data = await submitForm('/api/contact', input, options);
  if (typeof data.ticketId !== 'string' || !data.ticketId.trim() || data.ticketId.length > 100) {
    throw new Error('SUBMISSION_UNCONFIRMED');
  }
  return { ticketId: data.ticketId, ...(typeof data.message === 'string' ? { message: data.message } : {}) };
}

/** The email remains in the form until the service confirms the subscription. */
export async function subscribeNewsletter(email: string, options: SubmissionOptions = {}): Promise<void> {
  await submitForm('/api/newsletter/subscribe', { email: email.trim(), consent: true }, options);
}

/** Persist custom quote inquiry to backend store before claiming confirmation. */
export async function submitCustomQuoteInquiry(
  input: CustomQuoteSubmissionInput,
  options: SubmissionOptions = {}
): Promise<CustomQuoteSubmissionResult> {
  const customHeaders: Record<string, string> = {};
  if (input.submissionKey) {
    customHeaders['Idempotency-Key'] = input.submissionKey;
  }
  const data = await submitForm('/api/quotes', input, {
    ...options,
    headers: { ...customHeaders, ...(options.headers || {}) },
  });
  const quoteId = String(data.quoteId || data.id || '').trim();
  if (!quoteId || quoteId.length > 120) {
    throw new Error('SUBMISSION_UNCONFIRMED');
  }
  return {
    quoteId,
    whatsappUrl: typeof data.whatsappUrl === 'string' ? data.whatsappUrl : '',
    message: typeof data.message === 'string' ? data.message : undefined,
    inquiry: data.inquiry as Record<string, unknown> | undefined,
  };
}
