import { motion, useReducedMotion } from 'motion/react';

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** Compact, accessible boutique switch with a gentle spring settle. */
export default function SquishSwitch({ checked, onChange, label }: SquishSwitchProps) {
  const reduceMotion = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 items-center gap-2.5 rounded-full px-1 focus-ring"
    >
      <span dir="ltr" className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-[3px] transition-colors motion-reduce:transition-none ${checked ? 'border-[#B88A24] bg-[#C7982F]' : 'border-[var(--color-border)] bg-[var(--color-surface-elevated,#DDD8D0)]'}`}>
        <motion.span
          className="block h-5 w-5 rounded-full bg-white shadow-sm"
          initial={false}
          animate={{ x: checked ? 20 : 0, scaleX: checked && !reduceMotion ? 1.08 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 28 }}
        />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary,#635B52)] group-hover:text-[var(--color-accent-text,#806326)]">{label}</span>
    </button>
  );
}
