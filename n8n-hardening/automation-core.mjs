/** Pure input and routing logic for an n8n Code node or a small API adapter. */
export function normalizePakistaniPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^03\d{9}$/.test(digits)) digits = `92${digits.slice(1)}`;
  else if (/^3\d{9}$/.test(digits)) digits = `92${digits}`;
  if (!/^923\d{9}$/.test(digits)) throw new Error('INVALID_PHONE');
  return digits;
}

export function normalizeWords(value) {
  return String(value ?? '').toLocaleLowerCase('en')
    .normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/([a-z])\1{2,}/g, '$1$1').replace(/\s+/g, ' ').trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

function typoDistance(a, b) {
  const regular = levenshtein(a, b);
  if (a.length !== b.length) return regular;
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i] === b[i + 1] && a[i + 1] === b[i]
        && a.slice(0, i) === b.slice(0, i) && a.slice(i + 2) === b.slice(i + 2)) return 1;
  }
  return regular;
}

/** products must be loaded from wa_products; never use a baked-in catalog. */
export function matchProduct(text, products) {
  const query = normalizeWords(text);
  if (!Array.isArray(products)) throw new Error('PRODUCTS_NOT_LOADED');
  const candidates = [];
  for (const product of products) {
    if (!product?.id || !product?.name) continue;
    const aliases = Array.isArray(product.aliases) ? product.aliases : [];
    for (const label of [product.name, ...aliases]) {
      const name = normalizeWords(label);
      if (!name) continue;
      const exact = query.includes(name);
      // Fuzzy matching only for whole words, avoiding false product matches.
      const maxDistance = name.length >= 7 ? 2 : name.length >= 4 ? 1 : 0;
      const words = query.split(' ');
      const distance = name.includes(' ') ? 99 : Math.min(...words.map(w =>
        Math.abs(w.length - name.length) > maxDistance ? 99 : typoDistance(w, name)));
      if (exact || distance <= maxDistance) {
        candidates.push({ product, score: exact ? 100 + name.length : 50 - distance });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  // A near tie should be clarified, not guessed into a bill.
  if (candidates[0] && candidates[1] && candidates[0].product.id !== candidates[1].product.id
      && candidates[0].score - candidates[1].score < 2) return { ambiguous: true };
  return candidates[0] ? { product: candidates[0].product } : null;
}

export function compactHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter(m => m && typeof m.text === 'string' && ['user', 'assistant'].includes(m.role))
    .slice(-5).map(m => ({ role: m.role, text: m.text.slice(0, 500) }));
}

export function routeInbound({ message, products, session, now = Date.now() }) {
  const id = String(message?.id ?? '').trim();
  if (!id || id.length > 255) throw new Error('MESSAGE_ID_REQUIRED');
  const phone = normalizePakistaniPhone(message?.from);
  const type = String(message?.type ?? 'text');
  const text = type === 'text' ? String(message?.text ?? '').trim() : '';
  const inactive = !session?.updatedAt || now - Number(session.updatedAt) >= 30 * 60 * 1000;
  const previousState = inactive ? null : session.state;
  const normalized = normalizeWords(text);
  const escape = /^(cancel|menu|start|stop|reset|back|wapas|radd|منسوخ|مینو)\b/u.test(normalized);
  if (!text) return { id, phone, type, intent: 'unsupported_media',
    reply: 'Maaf kijiye, main abhi sirf text messages samajh sakta hoon.', resetSession: inactive };
  if (text.length > 1000) return { id, phone, type, intent: 'invalid_input',
    reply: 'Paigham bohat lamba hai. Meherbani karke mukhtasar text bhejein.', resetSession: inactive };
  if (escape) return { id, phone, type, text, intent: 'menu', resetSession: true };
  const productMatch = matchProduct(text, products);
  if (previousState === 'awaiting_quantity' && /^\d+(?:\.\d+)?(?:\s*(?:kg|g|gram|pack))?$/u.test(normalized)) {
    return { id, phone, type, text, intent: 'quantity', productMatch, resetSession: false };
  }
  const orderSignal = /\b(order|buy|purchase|place|mangwa|mangwana|bhejo|deliver|checkout|kg|kilo|gram|packet|pack)\b|آرڈر|خرید/u.test(normalized);
  const faqSignal = /\b(fayde|faide|benefits|quality|kya|how|what|delivery|price|rate)\b|فائد|قیمت/u.test(normalized);
  // Explicit ordering wins over a health/FAQ phrase in a mixed message.
  if (orderSignal) return { id, phone, type, text, intent: 'order',
    productMatch, resetSession: inactive || previousState === 'awaiting_quantity' };
  if (faqSignal || previousState === 'awaiting_quantity') {
    return { id, phone, type, text, intent: 'faq', productMatch, resetSession: previousState === 'awaiting_quantity' || inactive };
  }
  return { id, phone, type, text, intent: 'unknown', productMatch, resetSession: inactive };
}
