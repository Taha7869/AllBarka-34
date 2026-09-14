import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  User,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Crown,
  Sparkles,
  Lock,
  Clock
} from 'lucide-react';

interface CheckoutAuthChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onContinueAsGuest: () => void;
  itemCount?: number;
  totalAmount?: number;
}

export default function CheckoutAuthChoiceModal({
  isOpen,
  onClose,
  onSignIn,
  onContinueAsGuest,
  itemCount = 0,
  totalAmount = 0
}: CheckoutAuthChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[11500] flex items-center justify-center p-4 select-none">
      {/* Dark Luxury Blur Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Container in Pristine Whitish/Gold Luxury Theme */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md max-h-[95vh] overflow-y-auto bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-[28px] shadow-[0_24px_70px_rgba(31,18,15,0.28),0_0_35px_rgba(184,147,95,0.18)] flex flex-col p-6 sm:p-7 text-[var(--color-ink,#1A1A1A)]"
        id="checkout-auth-choice-modal"
      >
        {/* Subtle Ambient Gold Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close checkout options"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[var(--color-ink,#1A1A1A)] border border-[var(--color-gold,#B8935F)]/30 hover:border-[var(--color-gold,#B8935F)] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
        >
          <X size={15} />
        </button>

        {/* Brand Emblem & Header */}
        <div className="text-center space-y-2 pt-1 pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-[var(--color-gold,#B8935F)]/45 text-[var(--color-gold,#B8935F)] shadow-xs mx-auto mb-1">
            <Crown size={22} className="text-[var(--color-gold,#B8935F)]" />
          </div>
          
          <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
            AllBarka Checkout
          </span>
          
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--color-ink,#1A1A1A)] leading-tight">
            How would you like to proceed?
          </h2>
          
          <p className="text-xs text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed max-w-xs mx-auto">
            Choose an option below to complete your gourmet selection for Lahore delivery.
          </p>

          {/* Cart Snapshot Summary */}
          {totalAmount > 0 && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[var(--color-gold,#B8935F)]/30 text-[11px] font-medium text-[var(--color-ink,#1A1A1A)] shadow-2xs">
                <ShoppingBag size={12} className="text-[var(--color-gold,#B8935F)]" />
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in order
                </span>
                <span className="text-[var(--color-gold,#B8935F)] font-bold">•</span>
                <span className="font-serif font-bold">
                  Rs. {totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Vertical Options Stack */}
        <div className="space-y-3.5 pt-2">
          
          {/* Option A: Sign In / Create Account (Primary Gold Button with Ink Text) */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onSignIn}
              id="checkout-signin-option-btn"
              className="w-full py-3.5 px-5 rounded-2xl bg-[#B8935F] hover:bg-[#A67C48] text-[#1A1A1A] hover:text-[#000000] border border-[#B8935F] font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-white/30 flex items-center justify-center shrink-0 text-[#1A1A1A]">
                  <User size={15} />
                </div>
                <span className="font-extrabold tracking-wider">Sign In / Create Account</span>
              </div>
              <ArrowRight
                size={16}
                className="text-[#1A1A1A] group-hover:translate-x-1 transition-transform shrink-0"
              />
            </button>
            
            <p className="text-[10.5px] text-[var(--color-ink-muted,#5A5A5A)] px-2 leading-tight flex items-center gap-1.5">
              <Sparkles size={11} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span>Loads saved addresses, past orders, and unlocks 5% VIP Patron rewards.</span>
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-[var(--color-gold,#B8935F)]/25" />
            <span className="absolute bg-[var(--color-surface,#FDFBF7)] px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-muted,#5A5A5A)]/80">
              or
            </span>
          </div>

          {/* Option B: Continue as Guest (Secondary Outline Button with subtle gold border) */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onContinueAsGuest}
              id="checkout-guest-option-btn"
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-[#FAF9F5] text-[var(--color-ink,#1A1A1A)] border border-[var(--color-gold,#B8935F)]/40 hover:border-[var(--color-gold,#B8935F)] font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25 flex items-center justify-center shrink-0 text-[var(--color-gold,#B8935F)]">
                  <ShoppingBag size={15} />
                </div>
                <span className="font-bold tracking-wider">Continue as Guest</span>
              </div>
              <ArrowRight
                size={16}
                className="text-[var(--color-gold,#B8935F)] group-hover:translate-x-1 transition-transform shrink-0"
              />
            </button>
            
            <p className="text-[10.5px] text-[var(--color-ink-muted,#5A5A5A)] px-2 leading-tight flex items-center gap-1.5">
              <Clock size={11} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span>Fast direct checkout without creating a password. No login required.</span>
            </p>
          </div>

        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 pt-4 border-t border-[var(--color-gold,#B8935F)]/20 flex items-center justify-center gap-4 text-[10px] text-[var(--color-ink-muted,#5A5A5A)]">
          <div className="flex items-center gap-1">
            <Lock size={11} className="text-[var(--color-gold,#B8935F)]" />
            <span>256-Bit SSL Encrypted</span>
          </div>
          <span className="text-[var(--color-gold,#B8935F)]/40">•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-[var(--color-gold,#B8935F)]" />
            <span>Lahore Verified Delivery</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
