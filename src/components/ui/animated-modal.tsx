"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { acquireScrollLock } from "../../utils/scrollLock";

interface ModalContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

export function Modal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ open, setOpen }}>
      {children}
    </ModalContext.Provider>
  );
}

export function ModalTrigger({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { setOpen } = useModal();
  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden cursor-pointer",
        className
      )}
      onClick={() => {
        if (onClick) onClick();
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      const releaseLock = acquireScrollLock();
      return () => {
        releaseLock();
      };
    }
  }, [open]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  const modalDOM = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Solid Dark Dimmed Luxury Backdrop covering the whole viewport */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[999998] bg-black/90 backdrop-blur-xl"
          />

          {/* Modal Card with Dark Forest Green & Gold Luxury Border */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative z-[999999] w-full max-w-2xl rounded-3xl bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/40 p-5 sm:p-8 text-left shadow-2xl text-[var(--color-ink,#1A1A1A)] my-auto overflow-hidden",
              className
            )}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-[1000000] w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] hover:border-[var(--color-gold,#B8935F)] flex items-center justify-center transition-colors shadow-xs focus:outline-none cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(modalDOM, document.body);
}

export function ModalContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col flex-1 py-2 sm:py-3", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 pt-5 mt-4 border-t border-[#d4af37]/30",
        className
      )}
    >
      {children}
    </div>
  );
}
