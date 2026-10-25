import React, { useRef, useEffect, useState } from 'react';

interface ClickSparkProps {
  children?: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
}

export default function ClickSpark({
  children,
  sparkColor = "#D4AF37",
  sparkCount = 10
}: ClickSparkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const currentParticles = particlesRef.current;

      for (let i = currentParticles.length - 1; i >= 0; i--) {
        const p = currentParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // soft gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          currentParticles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = sparkColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    animationFrameId = requestAnimationFrame(updateAndDraw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [sparkColor]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newParticles: Particle[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      newParticles.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // initial upward push
        size: 2 + Math.random() * 3,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative inline-block cursor-pointer select-none"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full z-20"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
