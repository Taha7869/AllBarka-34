import type { ApprovedOpeningIntent } from '../lib/aiBuddyResolution';

export interface ConsultantRequest {
  message: string;
  history: unknown;
  system: string;
  signal?: AbortSignal;
}

export interface ProductSelectionReference {
  productId: string;
  variantLabel?: string | null;
}

export interface ConsultantReply {
  text: string;
  reply: string;
  action: 'answer' | 'human';
  available: true;
  modelUsed: 'n8n-groq';
  supportUrl?: string;
  openingIntent?: ApprovedOpeningIntent;
  conversationalOpening?: string;
  selectedProducts?: ProductSelectionReference[];
  suggestedCustomizations?: string[];
  applicablePolicies?: string[];
  missingInfoQuestions?: string[];
  recommendedProductIds?: string[];
  inquiryPrefill?: Record<string, any> | null;
  latencyMs?: number;
}

export const HUMAN_SUPPORT_URL = 'https://wa.me/923160666083';

export function normalizeConciergeHistory(history: unknown): Array<{ role: 'user' | 'assistant'; text: string }> {
  if (!Array.isArray(history)) return [];
  return history.flatMap(entry => {
    if (!entry || (entry.role !== 'user' && entry.role !== 'assistant')) return [];
    const value = entry.text ?? entry.content;
    if (typeof value !== 'string' || !value.trim()) return [];
    return [{ role: entry.role as 'user' | 'assistant', text: value.trim().slice(0, 1000) }];
  }).slice(-4);
}

/** Accept legacy envelopes, but never display malformed JSON or workflow errors as answers. */
export function extractN8nReply(value: unknown, depth = 0): ConsultantReply | null {
  if (depth > 3) return null;
  if (Array.isArray(value)) return value.length === 1 ? extractN8nReply(value[0], depth + 1) : null;
  if (!value || typeof value !== 'object') return null;
  const result = value as Record<string, any>;
  if (result.error || result.available === false || result.ok === false) return null;
  if (result.action !== undefined && result.action !== 'answer' && result.action !== 'human') return null;
  const answer = result.text ?? result.reply ?? result.output ?? result.replyText ?? result.message?.content;
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000) return null;
  const text = answer.trim();
  if (/^(?:\{|\[|```)/.test(text)) {
    try {
      return extractN8nReply(JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')), depth + 1);
    } catch { return null; }
  }
  const action = result.action === 'human' ? 'human' : 'answer';
  const rawOpeningIntent = result.openingIntent;
  const validOpeningIntents = ['greeting_celebration', 'greeting_gourmet', 'greeting_quote', 'greeting_general'];
  const openingIntent: ApprovedOpeningIntent | undefined =
    typeof rawOpeningIntent === 'string' && validOpeningIntents.includes(rawOpeningIntent.trim())
      ? (rawOpeningIntent.trim() as ApprovedOpeningIntent)
      : undefined;

  const conversationalOpening =
    typeof result.conversationalOpening === 'string' && result.conversationalOpening.trim()
      ? result.conversationalOpening.trim().slice(0, 1000)
      : undefined;

  const rawSelected = result.selectedProducts;
  const selectedProducts: ProductSelectionReference[] | undefined = Array.isArray(rawSelected)
    ? rawSelected
        .filter((item: any) => item && typeof item.productId === 'string' && item.productId.trim())
        .map((item: any) => ({
          productId: item.productId.trim(),
          variantLabel: typeof item.variantLabel === 'string' && item.variantLabel.trim() ? item.variantLabel.trim() : null,
        }))
    : undefined;

  const rawCustomizations = result.suggestedCustomizations;
  const suggestedCustomizations = Array.isArray(rawCustomizations)
    ? rawCustomizations.filter((c: any): c is string => typeof c === 'string' && Boolean(c.trim())).map(c => c.trim())
    : undefined;

  const rawPolicies = result.applicablePolicies;
  const applicablePolicies = Array.isArray(rawPolicies)
    ? rawPolicies.filter((p: any): p is string => typeof p === 'string' && Boolean(p.trim())).map(p => p.trim())
    : undefined;

  const rawQuestions = result.missingInfoQuestions;
  const missingInfoQuestions = Array.isArray(rawQuestions)
    ? rawQuestions.filter((q: any): q is string => typeof q === 'string' && Boolean(q.trim())).map(q => q.trim())
    : undefined;

  const rawIds = result.recommendedProductIds ?? result.recommendations ?? result.productIds;
  const recommendedProductIds = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())).map(id => id.trim())
    : undefined;
  const inquiryPrefill =
    result.inquiryPrefill && typeof result.inquiryPrefill === 'object' && !Array.isArray(result.inquiryPrefill)
      ? result.inquiryPrefill
      : null;

  return {
    text,
    reply: text,
    action,
    available: true,
    modelUsed: 'n8n-groq',
    ...(action === 'human' ? { supportUrl: HUMAN_SUPPORT_URL } : {}),
    ...(openingIntent ? { openingIntent } : {}),
    ...(conversationalOpening ? { conversationalOpening } : {}),
    ...(selectedProducts && selectedProducts.length > 0 ? { selectedProducts } : {}),
    ...(suggestedCustomizations && suggestedCustomizations.length > 0 ? { suggestedCustomizations } : {}),
    ...(applicablePolicies && applicablePolicies.length > 0 ? { applicablePolicies } : {}),
    ...(missingInfoQuestions && missingInfoQuestions.length > 0 ? { missingInfoQuestions } : {}),
    ...(recommendedProductIds && recommendedProductIds.length > 0 ? { recommendedProductIds } : {}),
    ...(inquiryPrefill ? { inquiryPrefill } : {}),
  };
}

export function getN8nAiConfig(env: NodeJS.ProcessEnv = process.env) {
  const endpoint = env.N8N_AI_WEBHOOK_URL?.trim();
  const secret = env.N8N_AI_WEBHOOK_SECRET?.trim() || '';
  if (!endpoint || secret.length < 32) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    const requested = Number(env.N8N_AI_TIMEOUT_MS || 22000);
    return { url: url.toString(), secret, timeoutMs: Number.isFinite(requested) ? Math.max(1000, Math.min(22000, requested)) : 22000 };
  } catch { return null; }
}

/** Only this private server bridge calls n8n; n8n owns the Groq credential and model. */
export async function askN8nConsultant(input: ConsultantRequest): Promise<ConsultantReply | null> {
  const config = getN8nAiConfig();
  if (!config) return null;
  if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > 1000) throw new Error('INVALID_MESSAGE');
  if (input.signal?.aborted) throw new DOMException('Request cancelled.', 'AbortError');
  const controller = new AbortController();
  let rejectCancellation: (reason: Error) => void = () => {};
  const cancelled = new Promise<never>((_, reject) => { rejectCancellation = reject; });
  const cancel = () => {
    controller.abort();
    rejectCancellation(new DOMException('Request cancelled.', 'AbortError'));
  };
  input.signal?.addEventListener('abort', cancel, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('AI_TIMEOUT')); }, config.timeoutMs);
  });
  try {
    return await Promise.race([deadline, cancelled, (async () => {
      const bridgeStart = Date.now();
      const response = await fetch(config.url, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-AllBarka-Webhook-Secret': config.secret },
        body: JSON.stringify({ source: 'website', message: input.message.trim(), history: normalizeConciergeHistory(input.history), system: input.system }),
      });
      const bridgeElapsed = Date.now() - bridgeStart;
      if (!response.ok) throw new Error(response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE');
      const parsed = extractN8nReply(await response.json());
      if (parsed) {
        parsed.latencyMs = bridgeElapsed;
      }
      return parsed;
    })()]);
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', cancel);
  }
}
