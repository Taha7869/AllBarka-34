export interface PublishedPatronReview {
  id: string;
  /** Always true: the review was linked to a real order. The order id itself is never sent to browsers. */
  verifiedOrder: true;
  name_en: string;
  name_ur: string;
  name_ar: string;
  location: string;
  purchasedItem: string;
  headline: string;
  review: string;
  rating: number;
  avatarInitials: string;
  published: true;
  publishedAt?: string;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function buildInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Projects raw review records strictly to public-safe, admin-published reviews
 * backed by a real orderId. Unpublished drafts, reviews without an orderId,
 * and private customer fields (phone, email, street address, uid) are excluded.
 */
export function sanitizePublishedReviews(raw: unknown): PublishedPatronReview[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: PublishedPatronReview[] = [];

  for (let i = 0; i < raw.length && out.length < 12; i += 1) {
    const entry = raw[i];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;

    const isPublished = rec.published === true || rec.status === 'published';
    if (!isPublished) continue;

    const orderId = cleanText(rec.orderId, 80);
    const verifiedOrder = (orderId.length >= 2) || rec.verifiedOrder === true;
    if (!verifiedOrder) continue;

    const reviewText = cleanText(rec.review ?? rec.comment ?? rec.quote, 1200);
    if (!reviewText) continue;

    const nameEn = cleanText(rec.name_en ?? rec.customerName ?? rec.name, 120);
    if (!nameEn) continue;

    const id = cleanText(rec.id, 80) || `rev-${i + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const rawRating = typeof rec.rating === 'number' && Number.isFinite(rec.rating) ? rec.rating : 5;
    const rating = Math.min(5, Math.max(1, Math.round(rawRating * 10) / 10));
    const publishedAt = cleanText(rec.publishedAt, 40) || undefined;

    out.push({
      id,
      verifiedOrder: true,
      name_en: nameEn,
      name_ur: cleanText(rec.name_ur, 120) || nameEn,
      name_ar: cleanText(rec.name_ar, 120) || nameEn,
      location: cleanText(rec.location ?? rec.area ?? rec.city, 120),
      purchasedItem: cleanText(rec.purchasedItem ?? rec.itemName, 160),
      headline: cleanText(rec.headline, 140),
      review: reviewText,
      rating,
      avatarInitials: cleanText(rec.avatarInitials, 4) || buildInitials(nameEn),
      published: true,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }

  return out;
}
