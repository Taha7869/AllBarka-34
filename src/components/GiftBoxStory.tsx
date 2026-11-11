import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import type { GiftBoxScene } from '../lib/giftBoxScene';

const CHAPTERS = ['one', 'two', 'three'] as const;
const POSTER = '/images/generated/hamper-emerald-coffer-v1.webp';
const CONTENTS = '/images/generated/gift-box-contents-v1.webp';

/**
 * GiftBoxStory — the homepage's one signature moment.
 * A pinned stage where scrolling turns the gift box, lifts its lid and looks inside,
 * while three short chapters change beside it. Without WebGL, or when the visitor
 * prefers reduced motion, it becomes a still photograph with all three chapters listed.
 */
export default function GiftBoxStory() {
  const { t, isRtl } = useLanguage();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chapter, setChapter] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (reduceMotion || !section || !canvas || typeof IntersectionObserver === 'undefined') return;

    let scene: GiftBoxScene | null = null;
    let cancelled = false;
    let visible = false;
    let loading = false;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      scene?.setProgress(progress);
      setChapter(progress < 0.3 ? 0 : progress < 0.64 ? 1 : 2);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    const onResize = () => { scene?.resize(); measure(); };

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const { createGiftBoxScene } = await import('../lib/giftBoxScene');
        if (cancelled) return;
        scene = createGiftBoxScene(canvas, CONTENTS, () => setLive(true));
        measure();
        if (visible) scene.start();
      } catch {
        // No WebGL: the photograph and the listed chapters remain.
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { void load(); scene?.start(); } else scene?.stop();
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
    const sizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    sizeObserver?.observe(canvas);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('pointermove', onPointer);
      scene?.dispose();
    };
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      id="gift-box-story"
      className={`gift-story${live ? ' is-live' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={t('story.label')}
    >
      <div className="gift-story-stage">
        <div className="gift-story-visual">
          <img className="gift-story-poster" src={POSTER} alt={t('story.imageAlt')} width={1000} height={1000} loading="lazy" decoding="async" />
          <canvas ref={canvasRef} className="gift-story-canvas" aria-hidden="true" />
        </div>

        <div className="gift-story-copy">
          <h2 className="gift-story-title">{t('story.title')}</h2>
          <ol className="gift-story-chapters">
            {CHAPTERS.map((id, index) => (
              <li key={id} className="gift-story-chapter" data-active={index === chapter}>
                <h3>{t(`story.${id}.title`)}</h3>
                <p>{t(`story.${id}.copy`)}</p>
              </li>
            ))}
          </ol>
          <Link to="/gifting" className="gift-story-cta focus-ring">{t('story.cta')}</Link>
        </div>
      </div>
    </section>
  );
}
