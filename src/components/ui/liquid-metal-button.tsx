import React from "react";
import { cn } from "../../lib/utils";

interface LiquidMetalWrapperProps {
  className?: string;
  children: React.ReactNode;
}

export const LiquidMetalWrapper = ({ className, children }: LiquidMetalWrapperProps) => {
  return (
    <div
      className={cn(
        "relative inline-flex overflow-hidden rounded-xl p-[2px] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2",
        className
      )}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2.5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(184,147,95,0)_0%,rgba(212,175,55,1)_50%,rgba(184,147,95,0)_100%)] opacity-80" />
      <div className="relative inline-flex h-full w-full bg-[var(--color-surface)] rounded-xl z-10 transition-colors">
        {children}
      </div>
    </div>
  );
};
