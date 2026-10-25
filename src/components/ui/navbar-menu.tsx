import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div 
      onMouseEnter={() => setActive(item)} 
      className="relative cursor-pointer"
    >
      <motion.p
        transition={{ duration: 0.2 }}
        className={cn(
          "text-xs font-bold uppercase tracking-wider transition-all duration-200 py-1.5 px-3.5 rounded-full select-none",
          active === item
            ? "text-[var(--color-ink)] bg-[var(--color-ink)]/10 shadow-xs border border-[#D4AF37]/40"
            : "text-[#D4AF37] hover:text-[var(--color-ink)] hover:bg-[var(--color-ink)]/5"
        )}
      >
        {item}
      </motion.p>

      {/* Seamless hover bridge: dropdown attaches directly to top-full with continuous padding */}
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 6 }}
          transition={transition}
        >
          {active === item && (
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 pt-3 z-[105] cursor-default"
              onMouseEnter={() => setActive(item)}
            >
              {/* Invisible top bridge element to prevent pointer dropouts */}
              <div className="absolute top-0 left-0 right-0 h-3.5 bg-transparent pointer-events-auto" />
              
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-[#0A2518]/95 backdrop-blur-2xl rounded-2xl border border-[#D4AF37]/40 shadow-[0_20px_60px_rgba(0,0,0,0.7)] text-[#FAF9F5] ring-1 ring-white/5"
              >
                <motion.div
                  layout
                  className="w-max h-full p-4"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
  className,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className={cn(
        "relative rounded-full border border-[#D4AF37]/35 bg-[#0A2518]/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex justify-center items-center space-x-1 sm:space-x-2 px-5 sm:px-6 py-2 select-none",
        className
      )}
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
  onClick,
}: {
  title: string;
  description: string;
  href?: string;
  src: string;
  onClick?: () => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href={href || "#"}
      onClick={handleClick}
      className="flex space-x-3.5 group/item cursor-pointer text-left max-w-[260px] p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
    >
      <img
        src={src}
        alt={title}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-lg w-[76px] h-[64px] object-cover border border-[#D4AF37]/25 shadow-sm group-hover/item:border-[#D4AF37] group-hover/item:scale-105 transition-all duration-300 bg-black/20"
      />
      <div className="flex flex-col justify-center">
        <h4 className="text-xs font-bold text-white group-hover/item:text-[#D4AF37] transition-colors leading-tight font-serif">
          {title}
        </h4>
        <p className="text-white/70 text-[11px] mt-1 leading-snug line-clamp-2">
          {description}
        </p>
      </div>
    </a>
  );
};

export const HoveredLink = ({
  children,
  href,
  onClick,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <a
      href={href || "#"}
      onClick={handleClick}
      className={cn(
        "text-white/80 hover:text-[#D4AF37] hover:bg-white/[0.04] px-2 py-1.5 rounded-lg transition-all duration-150 font-medium text-xs block hover:translate-x-1 cursor-pointer",
        className
      )}
    >
      {children}
    </a>
  );
};

export default Menu;
