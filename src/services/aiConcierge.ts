import { apiUrl } from '../lib/apiUrl';
import { PRODUCTS } from '../data/products';
import type { LanguageCode } from '../contexts/LanguageContext';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'gemma3:4b';
const TIMEOUT_MS = 30000;
const LANGUAGE_NAMES: Record<LanguageCode, string> = { en: 'English', ur: 'Urdu', ar: 'Arabic' };

let catalogCache: string | null = null;

function getCatalogContext(): string {
  if (catalogCache) return catalogCache;
  const lines = PRODUCTS.map(p => {
    const prices = Object.entries(p.prices).map(([portion, price]) => `${portion}: Rs. ${price}`).join(', ');
    return `- ${p.name_en} (${p.category}): ${prices} | ${p.desc_en}`;
  });
  catalogCache = lines.join('\n');
  return catalogCache;
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export async function chatWithOllama(
  messages: ChatMessage[],
  language: LanguageCode,
  onChunk: (text: string) => void,
  authToken?: string,
  signal?: AbortSignal
): Promise<void> {
  // Hosted visitors use the existing authenticated server API. Local Ollama is opt-in.
  if (import.meta.env.VITE_AI_PROVIDER !== 'ollama') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const lastMessage = messages.at(-1);
      const response = await fetch(apiUrl('/api/concierge/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          userText: lastMessage?.content || '',
          language,
          messages: messages.slice(0, -1).filter(message => message.role !== 'system').slice(-4).map(message => ({ role: message.role, text: message.content })),
        }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Concierge unavailable');
      if (result.modelUsed === 'allbarka-offline') throw new Error('AI assistant temporarily unavailable');
      const reply = result.text || result.reply;
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty concierge response');
      onChunk(reply);
      return;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are AllBarka's luxury dry-fruits concierge. Answer briefly (max 60 words), recommend only from the provided product catalog, never invent products, never give medical claims, reply in ${LANGUAGE_NAMES[language]}.
    
Catalog:
${getCatalogContext()}`
  };

  const payload = {
    model: MODEL,
    messages: [systemPrompt, ...messages],
    stream: true
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No streaming body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let pending = '';
    let receivedReply = false;
    const consumeLine = (line: string) => {
      if (!line.trim()) return;
      const parsed = JSON.parse(line) as { error?: string; message?: { content?: string } };
      if (parsed.error) throw new Error(parsed.error);
      if (typeof parsed.message?.content === 'string' && parsed.message.content) {
        receivedReply = true;
        onChunk(parsed.message.content);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
        let newline = pending.indexOf('\n');
        while (newline !== -1) {
          consumeLine(pending.slice(0, newline));
          pending = pending.slice(newline + 1);
          newline = pending.indexOf('\n');
        }
        if (done) {
          consumeLine(pending);
          break;
        }
      }
      if (!receivedReply) throw new Error('Empty concierge response');
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Connection to concierge timed out.');
    }
    throw error;
  } finally {
    clearTimeout(id);
    signal?.removeEventListener('abort', abort);
  }
}
