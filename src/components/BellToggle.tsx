import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bell } from 'lucide-react';

/** React Bits BellToggle adapted to the existing icon and Motion libraries. */
export default function BellToggle({ pressed, onChange, offLabel, onLabel, label, count = 0, disabled = false }: {
  pressed: boolean; onChange: (pressed: boolean) => void; offLabel: string; onLabel: string; label: string; count?: number; disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  return <button type="button" className="allbarka-bell-toggle focus-ring" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={() => onChange(!pressed)} data-enabled={pressed}>
    <motion.span className="allbarka-bell-glyph" aria-hidden="true" key={`${pressed}-${count}`} style={{ transformOrigin: '50% 16%' }}
      animate={pressed && !reduce ? { rotate: [0, 17, -13, 8, -4, 0] } : { rotate: 0 }} transition={{ duration: reduce ? 0 : .82 }}>
      <Bell size={19} />{pressed && count > 0 && <span className="allbarka-bell-badge">{count > 9 ? '9+' : count}</span>}
    </motion.span>
    <span className="allbarka-bell-label" dir="auto"><span aria-hidden={!pressed} className={pressed ? 'visible' : ''}>{onLabel}</span><span aria-hidden={pressed} className={!pressed ? 'visible' : ''}>{offLabel}</span></span>
  </button>;
}
