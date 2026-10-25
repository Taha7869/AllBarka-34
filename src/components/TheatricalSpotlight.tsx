import React from 'react';

interface TheatricalSpotlightProps {
  mousePos: { x: number; y: number };
}

export default function TheatricalSpotlight({ mousePos }: TheatricalSpotlightProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Primary Dynamic Mouse Spotlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full transition-transform duration-200 ease-out"
        style={{
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          background: 'radial-gradient(circle, rgba(255, 223, 118, 0.16) 0%, rgba(212, 175, 55, 0.05) 40%, rgba(0, 0, 0, 0) 75%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Hero Text Fixed Theatrical Beam */}
      <div
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full pointer-events-none opacity-40 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, rgba(10, 37, 24, 0) 70%)',
          filter: 'blur(45px)',
          animationDuration: '6s',
        }}
      />

      {/* Product Object Spotlight Ring */}
      <div
        className="absolute top-1/2 right-1/6 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.22) 0%, rgba(5, 20, 13, 0) 65%)',
          filter: 'blur(40px)',
        }}
      />
    </div>
  );
}
