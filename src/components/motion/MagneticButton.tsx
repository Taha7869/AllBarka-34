import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

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
  style?: React.CSSProperties;
}

/**
 * MagneticButton — wraps any element with a subtle magnetic cursor pull.
 * - Translates up to `strength` px toward the cursor on hover.
 * - Springs back on mouse-leave.
 * - Disabled on touch/coarse-pointer devices and prefers-reduced-motion.
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
  ...rest
}) => {
  const ref = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 22, mass: 0.5 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);

  const isTouchDevice = typeof window !== 'undefined'
    && window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (shouldReduceMotion || isTouchDevice || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) / rect.width * strength * 2);
    y.set((e.clientY - cy) / rect.height * strength * 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const motionProps = shouldReduceMotion || isTouchDevice
    ? {}
    : { style: { x: sx, y: sy, ...style } };

  // Render as motion.a for anchor, motion.button otherwise
  if (Tag === 'a') {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        id={id}
        {...motionProps}
        {...rest}
      >
        {children}
      </motion.a>
    );
  }

  if (Tag === 'div') {
    return (
      <motion.div
        ref={ref as React.Ref<HTMLDivElement>}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        id={id}
        style={motionProps.style}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      id={id}
      style={motionProps.style}
      {...rest}
    >
      {children}
    </motion.button>
  );
};

export default MagneticButton;
