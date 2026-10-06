import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './ScrollFloat.css';

gsap.registerPlugin(ScrollTrigger);

const ScrollFloat = ({
  children = '',
  scrollContainerRef = null,
  containerClassName = '',
  textClassName = '',
  animationDuration = 1,
  ease = 'power2.out',
  scrollStart = 'top bottom-=50px',
  scrollEnd = 'center center',
  stagger = 0.02
}) => {
  const containerRef = useRef(null);

  const words = useMemo(() => {
    const text = typeof children === 'string' ? children : '';
    return text.split(' ').map((word, wordIndex) => ({
      word,
      wordIndex,
      chars: word.split('').map((char, charIndex) => ({
        char,
        charIndex
      }))
    }));
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scroller =
      scrollContainerRef && scrollContainerRef.current
        ? scrollContainerRef.current
        : window;

    const charElements = el.querySelectorAll('.char');

    const ctx = gsap.context(() => {
      gsap.from(charElements, {
        y: '100%',
        opacity: 0,
        rotationZ: '8deg',
        duration: animationDuration,
        ease: ease,
        stagger: stagger,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: scrollStart,
          end: scrollEnd,
          scrub: true
        }
      });
    }, el);

    return () => {
      ctx.revert();
    };
  }, [
    scrollContainerRef,
    animationDuration,
    ease,
    scrollStart,
    scrollEnd,
    stagger
  ]);

  return (
    <div ref={containerRef} className={`scroll-float ${containerClassName}`}>
      <span className={`scroll-float-text ${textClassName}`}>
        {words.map(({ wordIndex, chars }) => (
          <span key={wordIndex} className="inline-block whitespace-nowrap">
            {chars.map(({ char, charIndex }) => (
              <span key={charIndex} className="char inline-block">
                {char}
              </span>
            ))}
            {wordIndex < words.length - 1 && (
              <span className="char inline-block">&nbsp;</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
};

export default ScrollFloat;
