import { useId, useState } from 'react';
import { Film, RotateCcw } from 'lucide-react';
import { useProductMediaLanguage } from '../hooks/useProductMediaLanguage';
import { validateProductMediaUrl } from '../lib/productMedia';

interface ProductVideoProps { videoUrl: string; poster?: string; productName: string; className?: string }

/** Optional owner-supplied film. No autoplay, preload or fabricated video for products without one. */
export default function ProductVideo({ videoUrl, poster = '', productName, className = '' }: ProductVideoProps) {
  const { t } = useProductMediaLanguage();
  const id = useId();
  const [failedUrl, setFailedUrl] = useState('');
  const [retry, setRetry] = useState(0);
  let src = ''; let image = '';
  try { src = validateProductMediaUrl(videoUrl, 'video', true); } catch { /* Invalid optional film is omitted. */ }
  try { image = validateProductMediaUrl(poster, 'image', true); } catch { /* The film can still work without a poster. */ }
  if (!src) return null;
  const failed = failedUrl === src;

  return <section className={`min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 ${className}`} aria-labelledby={`${id}-title`} dir="ltr">
    <h3 id={`${id}-title`} className="mb-3 flex items-center gap-2 font-serif text-lg text-[var(--color-text-primary)]"><Film size={17} className="text-[var(--color-accent-text)]" aria-hidden="true" /><span dir="auto">{t('media.film.title')}</span></h3>
    {failed ? <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-4"><p role="status" className="text-xs leading-6 text-[var(--color-text-secondary)]" dir="auto">{t('media.film.error')}</p><button type="button" className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-accent-text)]" onClick={() => { setFailedUrl(''); setRetry(current => current + 1); }}><RotateCcw size={15} aria-hidden="true" /><span dir="auto">{t('media.film.retry')}</span></button></div>
      : <video key={`${src}-${retry}`} src={src} poster={image || undefined} controls playsInline preload="none" tabIndex={0} aria-label={t('media.film.label').replace('{name}', productName)} aria-describedby={`${id}-hint`} onError={() => setFailedUrl(src)} className="aspect-video w-full rounded-xl bg-black object-contain" />}
    <p id={`${id}-hint`} className="mt-3 text-[11px] leading-5 text-[var(--color-text-secondary)]" dir="auto">{t('media.film.hint')}</p>
  </section>;
}
