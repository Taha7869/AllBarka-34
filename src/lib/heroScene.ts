/**
 * Default homepage hero scene (used when the merchant has not published a custom hero).
 * A film is only paired with its own matching still, so playback never jumps between
 * unrelated scenes. Set `film` once the matching Living Gallery motion assets exist.
 *
 * Rollback scene (kept in the repository):
 *   posters /images/generated/signature-film-desktop-v2.webp, signature-film-mobile-v2.webp
 *   films   /videos/signature-table-desktop-v2.mp4, /videos/signature-table-mobile-detail-v2.mp4
 */
export interface HeroSceneMedia {
  poster: string;
  width: number;
  height: number;
  film: string | null;
}

export const HERO_SCENE: { desktop: HeroSceneMedia; mobile: HeroSceneMedia } = {
  desktop: { poster: '/images/living-gallery-final/hero-desktop.webp', width: 1672, height: 941, film: null },
  mobile: { poster: '/images/living-gallery-final/hero-mobile.webp', width: 941, height: 1672, film: null },
};

/** Window event that opens the existing AI Buddy panel from anywhere on the page. */
export const OPEN_AI_BUDDY_EVENT = 'open-ai-concierge';
