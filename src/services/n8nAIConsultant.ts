interface ConsultantRequest {
  message: string;
  history: Array<{ role: string; text: string }>;
  system: string;
}

/**
 * The commerce API calls a private n8n webhook. n8n handles its own Ollama
 * tunnel and returns { text } or { reply }; no tunnel address reaches browsers.
 */
export async function askN8nConsultant(input: ConsultantRequest): Promise<string | null> {
  const endpoint = process.env.N8N_AI_WEBHOOK_URL;
  if (!endpoint) return null;
  const url = new URL(endpoint);
  if (url.protocol !== 'https:') throw new Error('N8N_AI_WEBHOOK_URL must use HTTPS');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_AI_WEBHOOK_SECRET
          ? { 'X-AllBarka-Webhook-Secret': process.env.N8N_AI_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`n8n returned ${response.status}`);
    const result = await response.json() as { text?: unknown; reply?: unknown; output?: unknown };
    const answer = result.text ?? result.reply ?? result.output;
    return typeof answer === 'string' && answer.trim()
      ? answer.trim().slice(0, 4000)
      : null;
  } finally {
    clearTimeout(timer);
  }
}
