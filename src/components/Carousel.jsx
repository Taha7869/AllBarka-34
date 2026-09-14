import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, CheckCircle2, Package, Award, Truck } from 'lucide-react';
import './Carousel.css';

const DEFAULT_ALLBARKA_DISTINCTIONS = [
  {
    id: 'distinction-1',
    title: '100% Organic Sourcing',
    description: 'Handpicked premium crop directly from trusted farms.',
    icon: <CheckCircle2 size={22} className="text-[#D4AF37]" />
  },
  {
    id: 'distinction-2',
    title: 'Vacuum-Sealed Freshness',
    description: 'Packed tightly to lock in natural aroma and crunch.',
    icon: <Package size={22} className="text-[#D4AF37]" />
  },
  {
    id: 'distinction-3',
    title: 'Hand Sorted & Polished',
    description: 'Rigorous quality checks ensuring absolute perfection.',
    icon: <Award size={22} className="text-[#D4AF37]" />
  },
  {
    id: 'distinction-4',
    title: 'Express Delivery in Lahore',
    description: 'Swift and safe delivery straight to your doorstep.',
    icon: <Truck size={22} className="text-[#D4AF37]" />
  }
];

export default function Carousel({
  items = DEFAULT_ALLBARKA_DISTINCTIONS,
  baseWidth = 300,
  autoplay = true,
  autoplayDelay = 3500,
  pauseOnHover = true,
  loop = true,
  round = false,
  className = ''
}) {
  const effectiveItems = items && items.length > 0 ? items : DEFAULT_ALLBARKA_DISTINCTIONS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dynamicWidth, setDynamicWidth] = useState(baseWidth);
  const containerRef = useRef(null);

  // Responsive dynamic width calculation to prevent horizontal overflow on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const screenWidth = window.innerWidth;
        if (screenWidth < 380) {
          setDynamicWidth(Math.min(260, screenWidth - 36));
        } else if (screenWidth < 640) {
          setDynamicWidth(Math.min(290, screenWidth - 48));
        } else {
          setDynamicWidth(baseWidth || 300);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [baseWidth]);

  const totalItems = effectiveItems.length;

  const handleNext = useCallback(() => {
    if (totalItems === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const handlePrev = useCallback(() => {
    if (totalItems === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  // Autoplay functionality with pause-on-hover
  useEffect(() => {
    if (!autoplay || (pauseOnHover && isHovered) || totalItems <= 1) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, pauseOnHover, isHovered, totalItems, handleNext]);

  // Drag Gesture Handling using Motion
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 30 });

  const handleDragEnd = (event, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      handleNext();
    } else if (info.offset.x > threshold) {
      handlePrev();
    }
  };

  if (!effectiveItems || effectiveItems.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`carousel-container ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Track Wrapper */}
      <div className="carousel-track-wrapper">
        <motion.div
          className="carousel-track"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <div 
            className="flex items-center gap-4 sm:gap-6 py-2 transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(calc(50% - ${currentIndex * (dynamicWidth + 24) + dynamicWidth / 2}px))`
            }}
          >
            {effectiveItems.map((item, index) => {
              const isActive = index === currentIndex;
              const distance = Math.abs(index - currentIndex);

              return (
                <motion.div
                  key={item.id || index}
                  onClick={() => setCurrentIndex(index)}
                  className={`carousel-item ${isActive ? 'active' : ''} ${round ? 'rounded-full' : ''}`}
                  style={{
                    width: `${dynamicWidth}px`,
                    opacity: isActive ? 1 : Math.max(0.45, 1 - distance * 0.3),
                    transform: isActive 
                      ? 'scale(1) translateZ(0)' 
                      : 'scale(0.92) translateZ(-50px)',
                    cursor: isActive ? 'default' : 'pointer'
                  }}
                  whileHover={{ scale: isActive ? 1.02 : 0.95 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 text-left">
                    {/* Icon container */}
                    <div className="carousel-icon-box">
                      {item.icon}
                    </div>

                    {/* Text content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse shrink-0" />
                        <h4 className="font-serif font-black text-brand-cream text-xs sm:text-sm tracking-wide">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-[10.5px] sm:text-[11px] text-brand-cream/80 leading-snug font-medium line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Luxury Navigation Controls & Dots */}
      <div className="carousel-controls">
        <button
          type="button"
          onClick={handlePrev}
          className="carousel-nav-btn"
          aria-label="Previous Feature"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Dots indicator */}
        <div className="carousel-dots">
          {effectiveItems.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="carousel-nav-btn"
          aria-label="Next Feature"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
