import type { LanguageCode } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/apiUrl';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export class ConciergeError extends Error {
  constructor(public code: string) { super(code); }
}

export async function chatWithConcierge(
  messages: ChatMessage[], language: LanguageCode, onChunk: (text: string) => void,
  authToken?: string, signal?: AbortSignal,
): Promise<{ action: 'answer' | 'human'; supportUrl?: string }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new ConciergeError('AI_TIMEOUT')); }, 30000);
    cancel = () => { controller.abort(); reject(new ConciergeError('AI_CANCELLED')); };
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
  try {
    return await Promise.race([deadline, (async () => {
      const lastMessage = messages.at(-1);
      const response = await fetch(apiUrl('/api/concierge/chat'), {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ userText: lastMessage?.content || '', language,
          messages: messages.slice(0, -1).filter(m => m.role === 'user' || m.role === 'assistant').slice(-4)
            .map(m => ({ role: m.role, text: m.content.slice(0, 1000) })) }),
      });
      const result = await response.json();
      if (!response.ok || result.available !== true) {
        throw new ConciergeError(result.code || (response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE'));
      }
      const reply = result.text ?? result.reply;
      if (typeof reply !== 'string' || !reply.trim() || reply.length > 4000 ||
        !['answer', 'human'].includes(result.action)) throw new ConciergeError('AI_UNAVAILABLE');
      if (controller.signal.aborted) throw new ConciergeError('AI_CANCELLED');
      onChunk(reply);
      return { action: result.action, ...(result.action === 'human' ? { supportUrl: 'https://wa.me/923160666083' } : {}) };
    })()]);
  } finally {
    clearTimeout(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}
