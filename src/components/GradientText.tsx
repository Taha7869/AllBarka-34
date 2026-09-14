import React from 'react';

interface GradientTextProps {
  children: React.ReactNode;
  colors?: string[];
  animationSpeed?: number;
  className?: string;
}

export default function GradientText({
  children,
  colors = ["#D4AF37", "#FDF5E6", "#DAA520", "#FDF5E6", "#D4AF37"],
  animationSpeed = 8,
  className = ""
}: GradientTextProps) {
  const gradientString = `linear-gradient(to right, ${colors.join(', ')})`;

  return (
    <span
      className={`inline-block font-bold bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: gradientString,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: `gradient-flow ${animationSpeed}s linear infinite`,
      }}
    >
      {children}
    </span>
  );
}
