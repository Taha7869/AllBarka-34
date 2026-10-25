import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, CheckCircle2, ShieldCheck, Sparkles, Box, RefreshCw } from 'lucide-react';

interface Interactive3DBoxProps {
  onOrderNowClick: () => void;
}

export default function Interactive3DBox({ onOrderNowClick }: Interactive3DBoxProps) {
  const [isUnboxed, setIsUnboxed] = useState(false);
  const [rotX, setRotX] = useState(-8);
  const [rotY, setRotY] = useState(15);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0, rotX: -8, rotY: 15 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: rotX,
      rotY: rotY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    const newRotY = startPosRef.current.rotY + deltaX * 0.6;
    const newRotX = Math.max(-30, Math.min(30, startPosRef.current.rotX - deltaY * 0.4));

    setRotY(newRotY);
    setRotX(newRotX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetRotation = () => {
    setRotX(-8);
    setRotY(15);
    setAutoRotate(true);
  };

  return (
    <div className="w-full max-w-lg relative select-none">
      {/* 1. Outer Whitish/Gold Luxury Floating Pane */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[32px] bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/35 p-6 sm:p-8 shadow-lg overflow-hidden text-[var(--color-ink,#1A1A1A)]"
      >
        {/* Subtle Ambient Shimmer Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-gold,#B8935F)]/5 via-transparent to-[var(--color-gold,#B8935F)]/10 pointer-events-none" />

        {/* Top Header & Interactive Pill */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)] font-sans">
              3D Spatial Casket
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetRotation}
              title="Reset View"
              className="p-1.5 rounded-full bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-[var(--color-gold,#B8935F)] hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
            </button>
            <span className="px-3 py-1 rounded-full bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-[9px] font-bold text-[var(--color-ink,#1A1A1A)] uppercase tracking-wider">
              {isUnboxed ? 'Open Vault Mode' : 'Interactive 3D Box'}
            </span>
          </div>
        </div>

        {/* 2. Interactive 3D Canvas / Viewing Port */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full h-72 sm:h-80 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden mb-6 shadow-inner"
          style={{ perspective: 1000 }}
        >
          {/* Ambient Studio Lighting Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Drag instruction badge */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[var(--color-gold,#B8935F)]/30 text-[8px] font-black uppercase text-[var(--color-gold,#B8935F)] tracking-wider shadow-xs">
            <Box size={10} />
            <span>Drag to rotate 3D view</span>
          </div>

          <AnimatePresence mode="wait">
            {!isUnboxed ? (
              /* Closed Luxury Box 3D Geometry */
              <motion.div
                key="3d-closed-box"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="relative flex items-center justify-center"
              >
                {/* 3D Box Container with Rotations */}
                <motion.div
                  animate={
                    autoRotate
                      ? { rotateY: [rotY, rotY + 360], rotateX: rotX }
                      : { rotateX: rotX, rotateY: rotY }
                  }
                  transition={
                    autoRotate
                      ? { repeat: Infinity, duration: 18, ease: 'linear' }
                      : { type: 'spring', stiffness: 200, damping: 20 }
                  }
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative w-56 sm:w-64 h-40 sm:h-44 rounded-2xl shadow-lg"
                >
                  {/* Front Face with Gold Filigree */}
                  <div className="absolute inset-0 rounded-2xl bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)] shadow-md flex flex-col items-center justify-center p-4 text-center overflow-hidden">
                    {/* Filigree Pattern Layer */}
                    <div className="absolute inset-0 bg-[radial-gradient(#b8935f_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-15" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--color-gold,#B8935F)]/15 rounded-full blur-xl pointer-events-none" />

                    {/* Royal Emblem Ornament */}
                    <div className="w-12 h-12 rounded-full border-2 border-[var(--color-gold,#B8935F)] bg-[var(--color-cream,#FAF9F5)] flex items-center justify-center mb-2 shadow-xs relative z-10">
                      <span className="font-serif text-[var(--color-gold,#B8935F)] font-black text-xl">
                        A
                      </span>
                    </div>

                    <span className="font-serif text-[var(--color-ink,#1A1A1A)] font-black text-base tracking-wider block relative z-10">
                      ALLBARKA
                    </span>
                    <span className="text-[8px] font-black tracking-[0.25em] text-[var(--color-gold,#B8935F)] uppercase block relative z-10 mt-0.5">
                      Lahore Royal Casket
                    </span>
                  </div>

                  {/* Top Lid Thickness */}
                  <div
                    style={{ transform: 'translateZ(18px) translateY(-10px)' }}
                    className="absolute inset-0 rounded-2xl border border-[var(--color-gold,#B8935F)]/40 pointer-events-none bg-[var(--color-gold,#B8935F)]/10 backdrop-blur-sm"
                  />
                </motion.div>

                {/* Metallic Golden Plinth / Pedestal */}
                <div className="absolute bottom-4 inset-x-8 h-8 rounded-full bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 blur-[1px] shadow-xs flex items-center justify-center">
                  <div className="w-3/4 h-2 rounded-full bg-[var(--color-gold,#B8935F)]/30 blur-[2px]" />
                </div>
              </motion.div>
            ) : (
              /* Liquid / Morphing Transition to 3D Interior Inspection View */
              <motion.div
                key="3d-interior-view"
                initial={{ opacity: 0, scale: 0.85, rotateX: -20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full p-4 sm:p-5 flex flex-col justify-between relative z-20 bg-[var(--color-surface,#FFFFFF)]"
              >
                {/* Header title */}
                <div className="text-center pb-2 border-b border-[var(--color-gold,#B8935F)]/20 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] flex items-center gap-1.5">
                    <Sparkles size={12} /> 4 Royal Compartments
                  </span>
                  <span className="text-[9px] text-[var(--color-gold,#B8935F)] font-bold uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={12} /> Gold Sealed
                  </span>
                </div>

                {/* Grid of 4 Interior Luxury Dry Fruit Vault Compartments */}
                <div className="grid grid-cols-2 gap-2.5 my-auto">
                  <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-center hover:border-[var(--color-gold,#B8935F)] transition-all duration-300 shadow-xs group">
                    <span className="text-[11px] text-[var(--color-ink,#1A1A1A)] font-bold block group-hover:text-[var(--color-gold,#B8935F)]">
                      Jumbo Pistachios
                    </span>
                    <span className="text-[8px] text-[var(--color-gold,#B8935F)] uppercase font-mono block mt-0.5">
                      250g • Saffron Roasted
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-center hover:border-[var(--color-gold,#B8935F)] transition-all duration-300 shadow-xs group">
                    <span className="text-[11px] text-[var(--color-ink,#1A1A1A)] font-bold block group-hover:text-[var(--color-gold,#B8935F)]">
                      Chilean Walnuts
                    </span>
                    <span className="text-[8px] text-[var(--color-gold,#B8935F)] uppercase font-mono block mt-0.5">
                      250g • Extra Pale Kernels
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-center hover:border-[var(--color-gold,#B8935F)] transition-all duration-300 shadow-xs group">
                    <span className="text-[11px] text-[var(--color-ink,#1A1A1A)] font-bold block group-hover:text-[var(--color-gold,#B8935F)]">
                      King Cashews
                    </span>
                    <span className="text-[8px] text-[var(--color-gold,#B8935F)] uppercase font-mono block mt-0.5">
                      250g • Whole W180 Grade
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 text-center hover:border-[var(--color-gold,#B8935F)] transition-all duration-300 shadow-xs group">
                    <span className="text-[11px] text-[var(--color-ink,#1A1A1A)] font-bold block group-hover:text-[var(--color-gold,#B8935F)]">
                      Organic Sun Figs
                    </span>
                    <span className="text-[8px] text-[var(--color-gold,#B8935F)] uppercase font-mono block mt-0.5">
                      250g • Garland Honeyed
                    </span>
                  </div>
                </div>

                {/* Weight & Authenticity Footnote */}
                <div className="pt-2 border-t border-[var(--color-gold,#B8935F)]/20 flex justify-between items-center text-[9px] text-[var(--color-ink-muted,#5A5A5A)] font-mono uppercase tracking-wider">
                  <span>Net Weight: 1.0 KG (1000g)</span>
                  <span className="text-[var(--color-gold,#B8935F)] font-bold">100% Hand-Sorted</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Product Info Section Layered on Floating Glass Pane */}
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-baseline">
            <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)] tracking-tight">
              Lahore Royal Velvet Box
            </h3>
            <span className="text-xl sm:text-2xl font-serif font-black text-[var(--color-gold,#B8935F)]">
              PKR 8,500
            </span>
          </div>

          <p className="text-[10px] text-[var(--color-ink-muted,#5A5A5A)] uppercase tracking-widest font-sans font-medium">
            4-Compartment Casket • Hand-embossed Gold Velvet Sleeve
          </p>

          {/* 4. Action CTAs with Whitish/Gold styling */}
          <div className="pt-3 flex gap-3">
            <button
              onClick={() => setIsUnboxed(!isUnboxed)}
              className="flex-1 py-3.5 px-4 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 hover:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] font-sans font-extrabold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <Eye size={14} className="text-[var(--color-gold,#B8935F)] animate-pulse" />
              {isUnboxed ? 'View Casket Exterior' : '3D Peek Interior'}
            </button>

            <button
              onClick={onOrderNowClick}
              className="py-3.5 px-6 rounded-xl bg-[var(--color-gold,#B8935F)] hover:bg-[var(--color-gold-light,#D4B483)] text-white font-sans font-black text-[11px] uppercase tracking-[0.2em] shadow-sm hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-[var(--color-gold,#B8935F)]"
            >
              Order Now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
