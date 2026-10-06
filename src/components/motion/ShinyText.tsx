import React from 'react';
import './ShinyText.css';

interface ShinyTextProps {
  text: string;
  className?: string;
}

/**
 * ShinyText — gold shimmer sweep across text via CSS background-clip gradient.
 * 3 s loop, paused on prefers-reduced-motion.
 * No JavaScript animation loop; pure CSS.
 */
const ShinyText: React.FC<ShinyTextProps> = ({ text, className = '' }) => {
  return (
    <span className={`shiny-text ${className}`} aria-label={text}>
      {text}
    </span>
  );
};

export default ShinyText;
