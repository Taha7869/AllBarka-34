import React, { useState, useEffect } from 'react';
import { Clock, Truck, Sparkles, MapPin } from 'lucide-react';

interface LahoreExpressTimerProps {
  className?: string;
  onOpenSchedule?: () => void;
}

export default function LahoreExpressTimer({ className = '', onOpenSchedule }: LahoreExpressTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 2,
    minutes: 15,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Target today's 4:00 PM Lahore cutoff (or tomorrow's if passed)
      const target = new Date();
      target.setHours(16, 0, 0, 0);

      let diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        // If passed 4pm, target next day 4pm
        target.setDate(target.getDate() + 1);
        diff = target.getTime() - now.getTime();
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const format2 = (n: number) => n.toString().padStart(2, '0');

  return (
    <div 
      className={`w-full bg-[#042821] text-[#EDE8DE] border-b border-[#D4AF37]/30 py-2 px-3 sm:px-4 text-[11px] sm:text-xs select-none transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
          <span className="text-[#D4AF37] font-serif font-bold tracking-wider uppercase text-[10px] sm:text-[11px]">
            Lahore Same-Day Express
          </span>
          <span className="hidden md:inline text-white/50">|</span>
          <span className="text-white/90">
            Order within{' '}
            <span className="font-mono font-bold text-[#E4C783] bg-white/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
              {timeLeft.hours}h {format2(timeLeft.minutes)}m {format2(timeLeft.seconds)}s
            </span>{' '}
            for evening dispatch
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10.5px] text-white/80">
          <span className="hidden sm:flex items-center gap-1 text-[#A8B2AF]">
            <MapPin size={11} className="text-[#D4AF37]" />
            DHA, Gulberg, Cantt & Model Town
          </span>
          {onOpenSchedule && (
            <button
              onClick={onOpenSchedule}
              className="text-[#D4AF37] hover:text-[#E4C783] underline underline-offset-2 font-medium cursor-pointer"
            >
              Delivery Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
