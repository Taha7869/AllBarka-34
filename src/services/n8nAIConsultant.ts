export interface ConsultantRequest {
  message: string;
  history: unknown;
  system: string;
}

export interface ConsultantReply {
  text: string;
  reply: string;
  action: 'answer' | 'human';
  available: true;
  modelUsed: 'n8n-groq';
  supportUrl?: string;
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
  return { text, reply: text, action, available: true, modelUsed: 'n8n-groq',
    ...(action === 'human' ? { supportUrl: HUMAN_SUPPORT_URL } : {}) };
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
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('AI_TIMEOUT')); }, config.timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(config.url, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-AllBarka-Webhook-Secret': config.secret },
        body: JSON.stringify({ source: 'website', message: input.message.trim(), history: normalizeConciergeHistory(input.history), system: input.system }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE');
      return extractN8nReply(await response.json());
    })()]);
  } finally { clearTimeout(timer); }
}
