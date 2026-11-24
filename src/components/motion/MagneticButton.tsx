import React, { useRef } from 'react';
import { usePrefersReducedMotion as useReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { MOTION_EASE_CSS } from '../../lib/motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number; // max pixel displacement (default 6)
  as?: 'button' | 'a' | 'div';
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  'aria-label'?: string;
  'aria-busy'?: boolean;
  'data-confirmed'?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/**
 * MagneticButton — lightweight pure-CSS magnetic cursor pull on pointer-fine desktops.
 * Zero motion/react spring allocations on mount; completely static on touch & reduced motion.
 */
const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  strength = 6,
  as: Tag = 'button',
  href,
  onClick,
  type = 'button',
  id,
  style,
  disabled = false,
  ...rest
}) => {
  const ref = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const isTouchDevice =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const active = !disabled && !shouldReduceMotion && !isTouchDevice;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * strength * 2;
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * strength * 2;
    ref.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = '';
  };

  const mergedStyle: React.CSSProperties | undefined = active
    ? { transition: `transform 220ms ${MOTION_EASE_CSS}`, ...style }
    : style;

  if (Tag === 'a') {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        className={className}
        onMouseMove={active ? handleMouseMove : undefined}
        onMouseLeave={active ? handleMouseLeave : undefined}
        id={id}
        style={mergedStyle}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (Tag === 'div') {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={className}
        onMouseMove={active ? handleMouseMove : undefined}
        onMouseLeave={active ? handleMouseLeave : undefined}
        id={id}
        onClick={onClick}
        style={mergedStyle}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      className={className}
      onMouseMove={active ? handleMouseMove : undefined}
      onMouseLeave={active ? handleMouseLeave : undefined}
      onClick={onClick}
      id={id}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
