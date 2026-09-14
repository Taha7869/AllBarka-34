import React from 'react';
import './StarBorder.css';

interface StarBorderProps {
  as?: React.ElementType;
  color?: string;
  speed?: string;
  thickness?: number | string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: any) => void;
  [key: string]: any;
}

export default function StarBorder({
  as: Component = 'button',
  color = '#D4AF37',
  speed = '4s',
  thickness = 2,
  children,
  className = '',
  style = {},
  ...props
}: StarBorderProps) {
  const formattedThickness = typeof thickness === 'number' ? `${thickness}px` : thickness;

  const customStyle = {
    ...style,
    '--border-color': color,
    '--animation-speed': speed,
    '--border-thickness': formattedThickness,
  } as React.CSSProperties;

  return (
    <Component
      className={`star-border-container ${className}`}
      style={customStyle}
      type={Component === 'button' ? 'button' : undefined}
      {...props}
    >
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color} 10%, transparent 80%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color} 10%, transparent 80%)`,
          animationDuration: speed,
        }}
      />
      <div className="inner-content">{children}</div>
    </Component>
  );
}
