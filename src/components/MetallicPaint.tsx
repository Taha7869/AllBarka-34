import React, { useState, useRef, useEffect, useId } from 'react';

interface MetallicPaintProps {
  children?: React.ReactNode;
  lightColor?: string;
  darkColor?: string;
  tintColor?: string;
}

export default function MetallicPaint({
  children,
  lightColor = "#FFD700",
  darkColor = "#0A2518",
  tintColor = "#D4AF37"
}: MetallicPaintProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightPos, setLightPos] = useState({ x: 150, y: 150 });
  const filterId = `metallic-paint-${useId().replace(/:/g, '')}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLightPos({ x, y });
  };

  // Set default centered light source on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setLightPos({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative inline-block"
      style={{
        filter: `url(#${filterId})`
      }}
    >
      {/* Embedded interactive SVG filter definition */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            {/* Create organic metallic bumps/texture */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="2"
              result="noise"
            />
            {/* Displace graphic slightly for a molten/painted flow */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            {/* Interactive specular highlight that tracks cursor position */}
            <feSpecularLighting
              in="displaced"
              specularExponent="25"
              specularConstant="1.2"
              lightingColor={lightColor}
              result="specOut"
            >
              <fePointLight x={lightPos.x} y={lightPos.y} z={45} />
            </feSpecularLighting>
            {/* Composite the specular glint with source graphic */}
            <feComposite
              in="specOut"
              in2="SourceGraphic"
              operator="arithmetic"
              k1="0" k2="1" k3="1" k4="0"
              result="lit"
            />
            {/* Colorize / tint the metallic surface with luxury gold */}
            <feColorMatrix
              type="matrix"
              values={`
                1.1 0 0 0 0.1
                0 0.9 0 0 0.05
                0 0 0.4 0 0
                0 0 0 1 0
              `}
              in="lit"
              result="colored"
            />
            {/* Final blend of original visual outline & metallic highlights */}
            <feBlend mode="color-dodge" in="colored" in2="SourceGraphic" />
          </filter>
        </defs>
      </svg>

      <div className="relative">
        {children}
      </div>
    </div>
  );
}
