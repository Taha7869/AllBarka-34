/**
 * AllBarka's branded loading mark: one almond that turns slowly.
 * `progress` (0 to 1) turns it by hand, for pull-to-refresh; without it, it spins on its own.
 * Under reduced motion it stays still.
 */
export default function AlmondLoader({ size = 36, progress, spinning = progress === undefined, label }: { size?: number; progress?: number; spinning?: boolean; label?: string }) {
  const turn = progress === undefined ? undefined : `rotate(${Math.round(Math.min(1, Math.max(0, progress)) * 300)}deg)`;
  return <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={spinning ? 'almond-loader-spin' : undefined} style={turn ? { transform: turn, transition: 'transform 60ms linear' } : undefined}>
      <defs>
        <linearGradient id="almond-shell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#D9A066" />
          <stop offset="0.55" stopColor="#B07436" />
          <stop offset="1" stopColor="#7A4A1F" />
        </linearGradient>
      </defs>
      <path d="M24 4C33 12 37 21 36 29c-1 8.5-6 14-12 15-6-1-11-6.5-12-15C11 21 15 12 24 4Z" fill="url(#almond-shell)" />
      <path d="M24 9c-2.5 8-3 17-1.5 30" stroke="#F3D7B0" strokeOpacity="0.55" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M18 18c-1 5-1 11 1 17M30 18c1 5 1 11-1 17" stroke="#5E3714" strokeOpacity="0.25" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  </span>;
}
