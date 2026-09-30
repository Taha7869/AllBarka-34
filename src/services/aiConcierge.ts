import { PRODUCTS } from '../data/products';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'gemma3:4b';
const TIMEOUT_MS = 8000;

let catalogCache: string | null = null;

function getCatalogContext(): string {
  if (catalogCache) return catalogCache;
  const lines = PRODUCTS.map(p => {
    const defaultPrice = Object.values(p.prices)[0];
    return `- ${p.name_en} (${p.category}): Rs. ${defaultPrice} | ${p.desc_en}`;
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
  isUrdu: boolean,
  onChunk: (text: string) => void
): Promise<void> {
  const systemPrompt: ChatMessage = {
    role: 'system',
    content: `You are AllBarka's luxury dry-fruits concierge. Answer briefly (max 60 words), recommend only from the provided product catalog, never invent products, never give medical claims, match the user's language (${isUrdu ? 'Urdu' : 'English'}).
    
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

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No streaming body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            onChunk(parsed.message.content);
          }
        } catch (e) {
          // ignore parsing error for partial chunks if any
        }
      }
    }
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      throw new Error('Connection to concierge timed out.');
    }
    throw error;
  }
}
