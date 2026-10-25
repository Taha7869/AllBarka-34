import { Star } from 'lucide-react';

interface PeekRatingProps {
  value: number;
  size?: number;
  className?: string;
}

/** A compact, read-only rating display for published customer feedback. */
export default function PeekRating({ value, size = 15, className = '' }: PeekRatingProps) {
  const rating = Math.min(5, Math.max(0, value));
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="img" aria-label={`${rating} / 5`}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className="inline-flex transition-transform duration-200 motion-reduce:transition-none group-hover:odd:-translate-y-0.5">
            <Star size={size} strokeWidth={1.7} fill={rating >= index + 0.5 ? 'currentColor' : 'none'} />
          </span>
        ))}
      </span>
      <span className="text-[11px] font-bold tabular-nums">{rating.toFixed(1)} / 5</span>
    </span>
  );
}
