import { apiUrl } from './apiUrl';
import { withApiDeadline } from './apiDeadline';

interface SubmissionOptions { timeoutMs?: number; signal?: AbortSignal; }
interface InquiryInput { name: string; contact: string; topic: string; message: string; }

async function submitForm(path: string, body: unknown, options: SubmissionOptions): Promise<Record<string, unknown>> {
  return withApiDeadline(async signal => {
    const response = await fetch(apiUrl(path), {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data?.success !== true || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('SUBMISSION_UNCONFIRMED');
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
