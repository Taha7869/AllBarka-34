import React, { useRef, useEffect } from 'react';

interface IridescenceProps {
  color?: number[]; // [r, g, b] scale multipliers
  speed?: number;
  className?: string;
}

export default function Iridescence({
  color = [0.72, 0.58, 0.37], // Gold tone
  speed = 0.5,
  className = ""
}: IridescenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color helpers matching the [r,g,b] multiplier into full RGB
    const baseR = Math.floor(color[0] * 255);
    const baseG = Math.floor(color[1] * 255);
    const baseB = Math.floor(color[2] * 255);

    // Render loop
    const render = () => {
      time += speed * 0.005;

      // Clear with soft ivory base
      ctx.fillStyle = '#FDFCFA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Draw 4 overlapping organic liquid blobs with varying sinus movement
      const blobs = [
        {
          x: width * 0.3 + Math.sin(time * 1.5) * width * 0.15,
          y: height * 0.4 + Math.cos(time * 1.2) * height * 0.15,
          radius: Math.min(width, height) * (0.45 + Math.sin(time * 0.8) * 0.05),
          color1: `rgba(${baseR}, ${baseG}, ${baseB}, 0.12)`,
          color2: `rgba(${baseR}, ${baseG}, ${baseB}, 0)`
        },
        {
          x: width * 0.7 + Math.cos(time * 1.1) * width * 0.18,
          y: height * 0.3 + Math.sin(time * 1.4) * height * 0.12,
          radius: Math.min(width, height) * (0.5 + Math.cos(time * 0.9) * 0.08),
          color1: `rgba(${baseR + 20}, ${baseG + 15}, ${baseB + 10}, 0.08)`,
          color2: `rgba(${baseR}, ${baseG}, ${baseB}, 0)`
        },
        {
          x: width * 0.5 + Math.sin(time * 0.9) * width * 0.22,
          y: height * 0.6 + Math.cos(time * 1.6) * height * 0.18,
          radius: Math.min(width, height) * (0.55 + Math.sin(time * 1.1) * 0.1),
          color1: `rgba(${baseR - 10}, ${baseG - 5}, ${baseB - 15}, 0.1)`,
          color2: `rgba(${baseR}, ${baseG}, ${baseB}, 0)`
        },
        {
          x: width * 0.2 + Math.cos(time * 1.7) * width * 0.12,
          y: height * 0.8 + Math.sin(time * 0.7) * height * 0.15,
          radius: Math.min(width, height) * (0.4 + Math.cos(time * 1.3) * 0.06),
          color1: `rgba(${baseR + 25}, ${baseG + 25}, ${baseB + 10}, 0.07)`,
          color2: `rgba(${baseR}, ${baseG}, ${baseB}, 0)`
        }
      ];

      // Enable standard multiply blending for gentle warm shimmering
      ctx.globalCompositeOperation = 'multiply';

      blobs.forEach((b) => {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        grad.addColorStop(0, b.color1);
        grad.addColorStop(1, b.color2);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Restore composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none z-0 ${className}`}
    />
  );
}
