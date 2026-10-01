import { Heart } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface PulseHeartProps {
  liked: boolean;
  onChange: (liked: boolean) => void;
  label: string;
  savedLabel: string;
  className?: string;
}

/** A quiet, controlled heart for a locally saved product. */
export default function PulseHeart({ liked, onChange, label, savedLabel, className = '' }: PulseHeartProps) {
  const reduceMotion = useReducedMotion();
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? savedLabel : label}
      onClick={() => onChange(!liked)}
      className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors focus-ring sm:text-xs ${liked ? 'border-[#C7982F]/65 bg-[#C7982F]/10 text-[#806326] dark:text-[#E4C783]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#C7982F]/65 hover:text-[#806326] dark:hover:text-[#E4C783]'} ${className}`}
    >
      <motion.span key={liked ? 'saved' : 'idle'} initial={reduceMotion ? false : { scale: 0.65 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
        <Heart size={16} fill={liked ? 'currentColor' : 'none'} strokeWidth={1.8} />
      </motion.span>
      <span>{liked ? savedLabel : label}</span>
    </button>
  );
}
