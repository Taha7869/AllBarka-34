import React, { useEffect, useRef } from 'react';

interface VelvetCanvasProps {
  mousePos: { x: number; y: number };
}

export default function VelvetCanvas({ mousePos }: VelvetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Gold thread particles
    const threadsCount = 35;
    const threads = Array.from({ length: threadsCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 15 + Math.random() * 35,
      angle: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.35,
      opacity: 0.15 + Math.random() * 0.4,
      width: 0.8 + Math.random() * 1.2,
      driftX: (Math.random() - 0.5) * 0.2,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Parallax shift based on normalized mouse coords
      const targetOffX = (mousePos.x - width / 2) * 0.025;
      const targetOffY = (mousePos.y - height / 2) * 0.025;

      // 1. Soft Warm Ivory/Cream Canvas Background Base
      const velvetGrad = ctx.createRadialGradient(
        width / 2 + targetOffX,
        height / 2 + targetOffY,
        100,
        width / 2 + targetOffX,
        height / 2 + targetOffY,
        Math.max(width, height) * 0.8
      );
      velvetGrad.addColorStop(0, '#FFFFFF');
      velvetGrad.addColorStop(0.5, '#FAF9F5');
      velvetGrad.addColorStop(1, '#FDFCFA');

      ctx.fillStyle = velvetGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Silk Fold Ambient Curves
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.lineWidth = 90;

      for (let i = 0; i < 3; i++) {
        const foldOffset = Math.sin(time * 0.8 + i * 2) * 40 + targetOffX * (i + 1) * 0.15;
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(250, 249, 245, 0.5)' : 'rgba(184, 147, 95, 0.04)';
        ctx.beginPath();
        ctx.moveTo(-100, height * 0.2 + i * 220 + foldOffset);
        ctx.bezierCurveTo(
          width * 0.3, height * 0.1 + i * 150 - foldOffset,
          width * 0.7, height * 0.4 + i * 180 + foldOffset,
          width + 100, height * 0.3 + i * 200 - foldOffset
        );
        ctx.stroke();
      }
      ctx.restore();

      // 3. Gold Threading Weave (Golden threads floating and shimmering)
      ctx.save();
      for (let i = 0; i < threads.length; i++) {
        const t = threads[i];
        t.y -= t.speed;
        t.x += t.driftX + (mousePos.x - width / 2) * 0.0001;

        if (t.y < -50) t.y = height + 50;
        if (t.x < -50) t.x = width + 50;
        if (t.x > width + 50) t.x = -50;

        const shimmer = Math.sin(time * 3 + i) * 0.3 + 0.7;
        const threadAlpha = t.opacity * shimmer;

        ctx.strokeStyle = `rgba(184, 147, 95, ${threadAlpha})`;
        ctx.lineWidth = t.width;
        ctx.shadowColor = '#B8935F';
        ctx.shadowBlur = 4 * shimmer;

        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(
          t.x + Math.cos(t.angle + Math.sin(time + i)) * t.length,
          t.y + Math.sin(t.angle + Math.cos(time + i)) * t.length
        );
        ctx.stroke();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full transition-opacity duration-1000"
    />
  );
}
