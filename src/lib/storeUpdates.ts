import { sanitizeFirestoreData } from './firestoreData';
export type UpdateLocale = 'en' | 'ur' | 'ar';
export type UpdateText = Record<UpdateLocale, string>;
export interface StoreUpdate { id: string; title: UpdateText; message: UpdateText; href: string; publishedAt: number }
export interface UpdatePreferences { enabled: boolean; seenAt: number }
export interface UpdateFeed { items: StoreUpdate[]; preferences: UpdatePreferences; unread: number; asOf: number }
export class StoreUpdateError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function updateLink(value: unknown): string {
  if (value === '' || value === undefined) return '';
  if (typeof value !== 'string' || value.length > 300 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) throw new StoreUpdateError('UPDATE_INVALID_LINK');
  const parsed = new URL(value, 'https://allbarka.invalid');
  if (parsed.origin !== 'https://allbarka.invalid' || !/^\/(?:shop|product|gifting|journal|pages|policies)(?:\/|$)/.test(parsed.pathname)) throw new StoreUpdateError('UPDATE_INVALID_LINK');
  return parsed.pathname + parsed.search + parsed.hash;
}
export function validateUpdateDraft(input: any) {
  if (!input || typeof input !== 'object') throw new StoreUpdateError('UPDATE_INVALID');
  const title: UpdateText = { en: '', ur: '', ar: '' }, message: UpdateText = { en: '', ur: '', ar: '' };
  for (const lang of ['en', 'ur', 'ar'] as const) {
    const rawTitle = input.title?.[lang], rawMessage = input.message?.[lang];
    if ((rawTitle !== undefined && typeof rawTitle !== 'string') || (rawMessage !== undefined && typeof rawMessage !== 'string')) throw new StoreUpdateError('UPDATE_INVALID');
    title[lang] = (rawTitle || '').trim(); message[lang] = (rawMessage || '').trim();
    if (title[lang].length > 90 || message[lang].length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(title[lang] + message[lang])) throw new StoreUpdateError('UPDATE_INVALID');
    if (!!title[lang] !== !!message[lang] || (lang === 'en' && !title.en)) throw new StoreUpdateError('UPDATE_INVALID');
  }
  if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) throw new StoreUpdateError('UPDATE_INVALID');
  return { title, message, href: updateLink(input.href), requestId: input.requestId };
}
export function sanitizeStoreUpdate(id: string, raw: any): StoreUpdate | null {
  try {
    if (!raw || typeof raw.publishedAt !== 'number' || !Number.isSafeInteger(raw.publishedAt) || raw.publishedAt <= 0 || raw.publishedAt > 8640000000000000) return null;
    const value = validateUpdateDraft({ ...raw, requestId: 'validated-record-0001' });
    return { id, title: value.title, message: value.message, href: value.href, publishedAt: raw.publishedAt };
  } catch { return null; }
}
export function updateCopy(item: StoreUpdate, language: UpdateLocale) {
  return item.title[language] && item.message[language] ? { title: item.title[language], message: item.message[language] } : { title: item.title.en, message: item.message.en };
}
export function updatePreferences(raw: any): UpdatePreferences {
  return { enabled: raw?.enabled === true, seenAt: typeof raw?.seenAt === 'number' && Number.isFinite(raw.seenAt) && raw.seenAt >= 0 ? raw.seenAt : 0 };
}
function requireDatabase(db: any) { if (!db) throw new StoreUpdateError('PERSISTENCE_UNAVAILABLE', 503); }
export async function listStoreUpdates(db: any): Promise<StoreUpdate[]> {
  requireDatabase(db);
  const records = await db.collection('storeUpdates').orderBy('publishedAt', 'desc').limit(40).get();
  return records.docs.map((doc: any) => sanitizeStoreUpdate(doc.id, doc.data())).filter(Boolean);
}
export async function readUpdateFeed(db: any, uid: string, now = Date.now()): Promise<UpdateFeed> {
  requireDatabase(db);
  const record = await db.collection('customerUpdatePreferences').doc(uid).get();
  const preferences = updatePreferences(record.exists ? record.data() : null);
  const items = preferences.enabled ? (await listStoreUpdates(db)).filter(item => item.publishedAt <= now) : [];
  return { items, preferences, unread: items.filter(item => item.publishedAt > preferences.seenAt).length, asOf: now };
}
export async function saveUpdatePreference(db: any, uid: string, enabled: unknown, now = Date.now()) {
  requireDatabase(db);
  if (typeof enabled !== 'boolean') throw new StoreUpdateError('UPDATE_INVALID');
  const ref = db.collection('customerUpdatePreferences').doc(uid);
  return db.runTransaction(async (tx: any) => {
    const existing = await tx.get(ref), previous = updatePreferences(existing.exists ? existing.data() : null);
    const next = { enabled, seenAt: enabled && !previous.enabled ? now : previous.seenAt };
    tx.set(ref, sanitizeFirestoreData({ ...next, updatedAt: now }), { merge: true }); return next;
  });
}
export async function markUpdatesRead(db: any, uid: string, through: unknown, now = Date.now()) {
  requireDatabase(db);
  if (typeof through !== 'number' || !Number.isFinite(through) || through < 0 || through > now) throw new StoreUpdateError('UPDATE_INVALID');
  const ref = db.collection('customerUpdatePreferences').doc(uid);
  return db.runTransaction(async (tx: any) => {
    const existing = await tx.get(ref), previous = updatePreferences(existing.exists ? existing.data() : null);
    const next = { ...previous, seenAt: Math.max(previous.seenAt, through) };
    tx.set(ref, sanitizeFirestoreData({ ...next, updatedAt: now }), { merge: true }); return next;
  });
}
export async function publishStoreUpdate(db: any, input: unknown, actor: { uid: string; email?: string }, now = Date.now()): Promise<StoreUpdate> {
  requireDatabase(db);
  const draft = validateUpdateDraft(input), id = `upd_${draft.requestId}`;
  const ref = db.collection('storeUpdates').doc(id);
  return db.runTransaction(async (tx: any) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const previous = sanitizeStoreUpdate(id, existing.data());
      if (!previous || JSON.stringify([previous.title, previous.message, previous.href]) !== JSON.stringify([draft.title, draft.message, draft.href])) throw new StoreUpdateError('UPDATE_CONFLICT', 409);
      return previous;
    }
    const update = { id, title: draft.title, message: draft.message, href: draft.href, publishedAt: now };
    tx.set(ref, sanitizeFirestoreData({ ...update, authorUid: actor.uid }));
    tx.set(ref.collection('audit').doc(), sanitizeFirestoreData({ action: 'PUBLISHED', actorUid: actor.uid, actorEmail: actor.email || '', timestamp: now }));
    return update;
  });
}
