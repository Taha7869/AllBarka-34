import assert from 'node:assert/strict';
import { compactHistory, matchProduct, normalizePakistaniPhone, routeInbound } from './automation-core.mjs';

const products = [
  { id: 'badam', name: 'Badam', aliases: ['almond'], price: 950, stock: 10 },
  { id: 'pista', name: 'Pista', aliases: ['pistachio'], price: 1250, stock: 10 },
];
const event = (text, overrides = {}) => ({ id: 'wamid-1', from: '03001234567', type: 'text', text, ...overrides });
assert.equal(normalizePakistaniPhone('+92 300 1234567'), '923001234567');
assert.equal(normalizePakistaniPhone('00923001234567'), '923001234567');
assert.equal(normalizePakistaniPhone('3001234567'), '923001234567');
assert.throws(() => normalizePakistaniPhone('123'), /INVALID_PHONE/);
assert.equal(matchProduct('badaaam ka rate', products).product.id, 'badam');
assert.equal(matchProduct('psita 1 kg', products).product.id, 'pista');
assert.throws(() => matchProduct('badam', null), /PRODUCTS_NOT_LOADED/);

const old = { state: 'awaiting_quantity', updatedAt: 1000 };
const recent = { state: 'awaiting_quantity', updatedAt: 60_000 };
assert.equal(routeInbound({ message: event('badam ke fayde aur 1 kg ka order place karo'), products, now: 60_001 }).intent, 'order');
assert.equal(routeInbound({ message: event('2 kg'), products, session: recent, now: 60_001 }).intent, 'quantity');
const changed = routeInbound({ message: event('badam ke fayde?'), products, session: recent, now: 60_001 });
assert.equal(changed.intent, 'faq');
assert.equal(changed.resetSession, true);
assert.equal(routeInbound({ message: event('cancel'), products, session: recent, now: 60_001 }).intent, 'menu');
assert.equal(routeInbound({ message: event('2 kg'), products, session: old, now: 2_000_000 }).intent, 'order');
const media = routeInbound({ message: event('', { type: 'image' }), products });
assert.equal(media.intent, 'unsupported_media');
assert.match(media.reply, /sirf text/);
assert.throws(() => routeInbound({ message: event('hi', { id: '' }), products }), /MESSAGE_ID_REQUIRED/);

const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'x'.repeat(700) }));
const compact = compactHistory(history);
assert.equal(compact.length, 5);
assert.ok(compact.every(m => m.text.length === 500));
console.log('Routing, typo tolerance, phone normalization, media fallback, session reset and bounded context passed');
