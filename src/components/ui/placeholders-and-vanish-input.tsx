"use client";

import React, { useCallback, useEffect, useRef, useState, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

interface Particle {
  x: number;
  y: number;
  r: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  opacity: number;
}

export function PlaceholdersAndVanishInput({
  id: externalId,
  label = "Search catalogue",
  placeholder,
  placeholders,
  onChange,
  onSubmit,
  value: controlledValue,
  className,
  suggestionsId,
  suggestionsOpen,
}: {
  id?: string;
  label?: string;
  placeholder?: string;
  placeholders: string[];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  value?: string;
  className?: string;
  suggestionsId?: string;
  suggestionsOpen?: boolean;
}) {
  const generatedId = useId();
  const inputId = externalId || `search-input-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [value, setValue] = useState(controlledValue || "");
  const [animating, setAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  // Sync internal state if controlledValue changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  // Monitor document visibility to pause placeholder rotation when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Rotate placeholders every 3 seconds only when not focused, not typing, tab visible, and reduced motion not active
  useEffect(() => {
    if (placeholders.length <= 1) return;
    if (isFocused || value.trim().length > 0 || !isDocumentVisible) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholders.length, isFocused, value, isDocumentVisible]);

  const drawParticles = useCallback((particles: Particle[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }, []);

  const drawAndAnimate = () => {
    const canvas = canvasRef.current;
    const input = inputRef.current;
    if (!canvas || !input) {
      setAnimating(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setAnimating(false);
      return;
    }

    const rect = input.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw current input text to canvas to sample pixel coordinates
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const computedStyle = window.getComputedStyle(input);
    const fontSize = computedStyle.fontSize || "16px";
    const fontFamily = computedStyle.fontFamily || "sans-serif";
    const fontWeight = computedStyle.fontWeight || "500";
    ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    ctx.fillStyle = "#C7982F";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 20;
    ctx.fillText(value, paddingLeft, canvas.height / 2);

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      setAnimating(false);
      return;
    }

    const data = imgData.data;
    const particles: Particle[] = [];

    const step = 3;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 100) {
          const rand = Math.random();
          const color = rand > 0.6 ? "#C7982F" : rand > 0.3 ? "#E4C783" : "#042821";
          particles.push({
            x,
            y,
            r: Math.random() * 2 + 1,
            color,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 1.5) * 3,
            life: Math.random() * 24 + 18,
            opacity: 1,
          });
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (particles.length === 0) {
      setAnimating(false);
      return;
    }

    let activeParticles = [...particles];

    const render = () => {
      activeParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.05; // float upwards
        p.opacity -= 0.035;
        p.life -= 1;
      });

      activeParticles = activeParticles.filter((p) => p.life > 0 && p.opacity > 0);
      drawParticles(activeParticles);

      if (activeParticles.length > 0) {
        animationFrameId.current = requestAnimationFrame(render);
      } else {
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        setAnimating(false);
      }
    };

    render();
  };

  const vanishAndSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    if (!value.trim() || animating) return;

    // Search query is submitted immediately so the query is never lost or swallowed!
    if (onSubmit && e) {
      onSubmit(e);
    }

    // Check prefers-reduced-motion: if reduced, skip particles completely
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    setAnimating(true);
    drawAndAnimate();
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isComposingRef.current) return;
    vanishAndSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isComposingRef.current) {
      // Prevent premature submit while selecting IME candidates (e.g. Urdu/Arabic keyboard)
      e.preventDefault();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full max-w-2xl mx-auto h-13 sm:h-14 rounded-full overflow-hidden shadow-lg bg-[var(--color-surface-elevated)] border border-[var(--color-accent)]/50 transition-all duration-300 focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30",
        className
      )}
    >
      {/* Screen Reader Label for Accessible Input */}
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      {/* Animation Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute top-0 left-0 z-30 w-full h-full"
        aria-hidden="true"
      />

      {/* Actual Input - warm cream surface with readable charcoal ink text */}
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        autoComplete="off"
        role={suggestionsId ? 'combobox' : undefined}
        aria-autocomplete={suggestionsId ? 'list' : undefined}
        aria-controls={suggestionsId}
        aria-expanded={suggestionsId ? Boolean(suggestionsOpen) : undefined}
        value={value}
        placeholder={isFocused ? placeholder : ""}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { isComposingRef.current = false; }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setValue(e.target.value);
          if (onChange) onChange(e);
        }}
        className={cn(
          "w-full h-full bg-transparent ps-5 sm:ps-7 pe-14 text-sm sm:text-base font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none z-10 relative selection:bg-[var(--color-accent)]/25 selection:text-[var(--color-text-primary)] caret-[var(--color-accent)]",
          animating && "text-transparent"
        )}
      />

      {/* Rotating Placeholders Overlay - high contrast bronze/charcoal text */}
      <div className="pointer-events-none absolute inset-0 flex items-center ps-5 sm:ps-7 pe-14 z-10 overflow-hidden" aria-hidden="true">
        <AnimatePresence mode="wait">
          {!value && !isFocused && (
            <motion.p
              key={`placeholder-${currentPlaceholder}`}
              initial={{ y: 9, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -9, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute max-w-[calc(100%-1rem)] text-xs sm:text-sm md:text-base font-medium text-[var(--color-text-secondary)] truncate select-none text-left"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Luxury Search Submit Button */}
      <button
        type="submit"
        disabled={!value.trim() || animating}
        className={cn(
          "absolute end-2 sm:end-2.5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
          value.trim() && !animating
            ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-accent)] hover:text-[var(--color-text-on-gold)] shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            : "bg-[var(--color-surface-subtle)] text-[var(--color-accent-text)] border border-[var(--color-accent)]/25 cursor-default"
        )}
        aria-label={label}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m5 12 7-7 7 7" />
          <path d="M12 19V5" />
        </svg>
      </button>
    </form>
  );
}

export default PlaceholdersAndVanishInput;
