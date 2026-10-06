import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface LuxuryTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxRotation?: number;
}

export default function LuxuryTiltCard({
  children,
  className = '',
  maxRotation = 8
}: LuxuryTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glint, setGlint] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -maxRotation;
    const rY = ((x - centerX) / centerX) * maxRotation;

    setRotateX(rX);
    setRotateY(rY);
    setGlint({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.18
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlint((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`[perspective:1000px] select-none ${className}`}
    >
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full"
      >
        {/* Specular Light Sweep Overlay */}
        <div
          className="absolute inset-0 rounded-[28px] pointer-events-none z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glint.x}% ${glint.y}%, rgba(212,175,55,0.3) 0%, rgba(255,255,255,0.15) 25%, transparent 65%)`,
            opacity: glint.opacity
          }}
        />
        {children}
      </motion.div>
    </div>
  );
}
