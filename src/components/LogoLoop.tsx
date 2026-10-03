import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export interface LogoItem {
  node?: React.ReactNode;
  src?: string;
  alt?: string;
  title: string;
  href?: string;
}

interface LogoLoopProps {
  logos: LogoItem[];
  direction?: 'left' | 'right';
  fadeOut?: boolean;
  fadeOutColor?: string;
  /** Pixels per second, matching the supplied React Bits component. */
  speed?: number;
  logoHeight?: number;
  gap?: number;
  paused?: boolean;
  ariaLabel: string;
  className?: string;
  renderItem?: (item: LogoItem, key: string, duplicate: boolean) => React.ReactNode;
}

/** A measured, seamless collection ribbon with one keyboard-accessible sequence. */
export default function LogoLoop({ logos, direction = 'left', fadeOut = true, fadeOutColor,
  speed = 26, logoHeight = 28, gap = 36, paused = false, ariaLabel, className = '', renderItem }: LogoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();
  const [sequenceWidth, setSequenceWidth] = useState(0);
  const [copyCount, setCopyCount] = useState(2);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const sequence = sequenceRef.current;
    if (!container || !sequence) return;
    const measure = () => {
      const width = sequence.getBoundingClientRect().width;
      if (width <= 0) return;
      setSequenceWidth(width);
      setCopyCount(Math.min(12, Math.max(2, Math.ceil(container.clientWidth / width) + 2)));
    };
    measure();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    resizeObserver?.observe(container);
    resizeObserver?.observe(sequence);
    window.addEventListener('resize', measure);
    sequence.addEventListener('load', measure, true);
    return () => { resizeObserver?.disconnect(); window.removeEventListener('resize', measure); sequence.removeEventListener('load', measure, true); };
  }, [logos, gap, logoHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const stationary = !!reduceMotion || focused || speed === 0;
  const style = {
    '--logoloop-gap': `${gap}px`, '--logoloop-height': `${logoHeight}px`,
    '--logoloop-distance': `${sequenceWidth}px`,
    '--logoloop-duration': `${Math.max(1, sequenceWidth / Math.max(1, Math.abs(speed)))}s`,
    '--logoloop-direction': direction === 'right' ? 'reverse' : 'normal',
    '--logoloop-state': paused || hovered || !visible || !documentVisible || stationary ? 'paused' : 'running',
    ...(fadeOutColor ? { '--logoloop-fade': fadeOutColor } : {}),
  } as React.CSSProperties;

  return (
    <div ref={containerRef} dir="ltr" className={`logoloop ${fadeOut ? 'logoloop--fade' : ''} ${stationary ? 'logoloop--static' : ''} ${className}`}
      style={style} role="region" aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          event.currentTarget.scrollLeft = 0;
          setFocused(false);
        }
      }}>
      <div className="logoloop__track">
        {Array.from({ length: stationary ? 1 : copyCount }, (_, copyIndex) => (
          <ul key={copyIndex} className="logoloop__list" aria-hidden={copyIndex > 0 ? true : undefined} ref={copyIndex === 0 ? sequenceRef : undefined}>
            {logos.map((item, itemIndex) => {
              const key = `${copyIndex}-${itemIndex}`;
              const duplicate = copyIndex > 0;
              const content = item.node ?? <img src={item.src} alt={duplicate ? '' : (item.alt ?? item.title)} height={logoHeight} loading="lazy" decoding="async" draggable={false} />;
              return <li className="logoloop__item" key={key}>{renderItem ? renderItem(item, key, duplicate)
                : item.href ? <a className="logoloop__link" href={item.href} aria-label={item.title} tabIndex={duplicate ? -1 : undefined}>
                  <span className="logoloop__node" aria-hidden="true">{content}</span>
                </a> : <span className="logoloop__node">{content}</span>}</li>;
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}
