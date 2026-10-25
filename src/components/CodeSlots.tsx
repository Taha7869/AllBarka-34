import { useRef, useState } from 'react';

interface CodeSlotsProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  length?: number;
}

export default function CodeSlots({ value, onChange, label, length = 6 }: CodeSlotsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div dir="ltr" className="relative mx-auto w-fit" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={label}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-center gap-1.5 sm:gap-2" aria-hidden="true">
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={`flex h-12 w-10 items-center justify-center rounded-xl border bg-white text-xl font-bold text-[#29231D] shadow-2xs transition-colors sm:h-14 sm:w-12 ${focused && index === Math.min(value.length, length - 1) ? 'border-[#B8935F] ring-2 ring-[#B8935F]/30' : 'border-[#B8935F]/35'}`}
          >
            {value[index] || (focused && index === value.length ? <span className="h-5 w-px animate-pulse bg-[#806326] motion-reduce:animate-none" /> : null)}
          </span>
        ))}
      </div>
    </div>
  );
}
