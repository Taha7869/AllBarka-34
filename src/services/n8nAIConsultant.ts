interface ConsultantRequest {
  message: string;
  history: unknown;
  system: string;
}

export function normalizeConciergeHistory(history: unknown): Array<{ role: 'user' | 'assistant'; text: string }> {
  if (!Array.isArray(history)) return [];
  return history.flatMap(message => {
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) return [];
    const text = message.text ?? message.content;
    return typeof text === 'string' && text.trim()
      ? [{ role: message.role as 'user' | 'assistant', text: text.trim().slice(0, 1000) }] : [];
  }).slice(-4);
}

/** Accept standard webhook, n8n item-array and the existing Ollama JSON reply. */
export function extractN8nReply(result: unknown): string | null {
  const item = Array.isArray(result) ? result[0] : result;
  if (!item || typeof item !== 'object' || 'error' in item) return null;
  const response = item as { text?: unknown; reply?: unknown; output?: unknown; replyText?: unknown; message?: { content?: unknown } };
  const answer = response.text ?? response.reply ?? response.output ?? response.replyText ?? response.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) return null;
  const text = answer.trim();
  if (text.startsWith('{') || text.startsWith('[') || text.startsWith('```')) {
    try {
      const json = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      return extractN8nReply(JSON.parse(json));
    } catch { return null; }
  }
  return text.slice(0, 4000);
}

/**
 * The commerce API calls a private n8n webhook. n8n handles its own Ollama
 * tunnel and returns { text } or { reply }; no tunnel address reaches browsers.
 */
export async function askN8nConsultant(input: ConsultantRequest): Promise<string | null> {
  const endpoint = process.env.N8N_AI_WEBHOOK_URL;
  if (!endpoint) return null;
  const url = new URL(endpoint.trim());
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('N8N_AI_WEBHOOK_URL must use HTTPS without URL credentials');
  const secret = process.env.N8N_AI_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('N8N_AI_WEBHOOK_SECRET is required for the website AI webhook');
  const timeoutMs = Number(process.env.N8N_AI_TIMEOUT_MS || 22000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 25000) throw new Error('N8N_AI_TIMEOUT_MS must be between 1000 and 25000');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AllBarka-Webhook-Secret': secret,
      },
      body: JSON.stringify({ ...input, source: 'website', history: normalizeConciergeHistory(input.history) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`n8n returned ${response.status}`);
    return extractN8nReply(await response.json());
  } finally {
    clearTimeout(timer);
  }
}
