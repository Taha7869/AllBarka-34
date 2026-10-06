import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

interface ThreeDCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
}

export default function ThreeDCard({ children, className = '', depth = 20 }: ThreeDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glintPos, setGlintPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-15deg to +15deg)
    const rotX = ((y - centerY) / centerY) * -14;
    const rotY = ((x - centerX) / centerX) * 14;

    setRotateX(rotX);
    setRotateY(rotY);

    // Dynamic light sheen position
    const glintX = (x / rect.width) * 100;
    const glintY = (y / rect.height) * 100;
    setGlintPos({ x: glintX, y: glintY, opacity: 0.25 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlintPos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-pointer select-none [perspective:1000px] ${className}`}
    >
      <motion.div
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full h-full rounded-3xl transition-shadow duration-300"
      >
        {/* Dynamic Light Sheen Glint Layer */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glintPos.x}% ${glintPos.y}%, rgba(255,255,255,0.4) 0%, rgba(212,175,55,0.15) 30%, transparent 70%)`,
            opacity: glintPos.opacity,
          }}
        />

        {/* Card Content with 3D depth support */}
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
