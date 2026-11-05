import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, X, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { prepareVoiceAudio, transcribeVoiceInput } from '../services/voiceInput';
import { VOICE_INPUT_MAX_CHARS, VOICE_MAX_CAPTURE_BYTES, VOICE_MAX_CAPTURE_SECONDS, VOICE_MAX_TRANSCRIPT_CHARS } from '../lib/voiceLimits';

type Phase = 'idle' | 'permission' | 'recording' | 'processing' | 'review' | 'error';
export default function VoiceInputButton({ onTranscript, disabled = false, placement = 'below' }: { onTranscript: (text: string) => void; disabled?: boolean; placement?: 'above' | 'below' }) {
  const { t, isRtl } = useLanguage();
  const { currentUser } = useAuth();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(VOICE_MAX_CAPTURE_SECONDS);
  const [truncated, setTruncated] = useState(false);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdown = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const busy = useRef(false);

  const release = useCallback(() => {
    clearTimeout(timer.current); clearInterval(countdown.current); clearTimeout(deadline.current);
    request.current?.abort(); request.current = null;
    try { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); }
    catch { /* A device may end concurrently; tracks still have to be released. */ }
    recorder.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }, []);
  const invalidate = useCallback(() => { generation.current++; busy.current = false; release(); }, [release]);
  const cancel = () => { invalidate(); setDraft(''); setPhase('idle'); trigger.current?.focus(); };

  useEffect(() => {
    setSupported(Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder && window.AudioContext && window.OfflineAudioContext));
    return invalidate;
  }, [invalidate]);
  useEffect(() => { if (disabled) { generation.current++; busy.current = false; release(); setPhase('idle'); } }, [disabled, release]);
  // A change of account must cancel any private in-flight result.
  useEffect(() => { generation.current++; busy.current = false; release(); setPhase('idle'); }, [currentUser?.uid, release]);

  useEffect(() => {
    const stop = () => { generation.current++; busy.current = false; release(); setPhase('idle'); setDraft(''); };
    const hide = () => { if (document.hidden) stop(); };
    window.addEventListener('allbarka:voice-start', stop);
    window.addEventListener('allbarka:voice-cancel', stop);
    document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('allbarka:voice-start', stop); window.removeEventListener('allbarka:voice-cancel', stop); document.removeEventListener('visibilitychange', hide); };
  }, [release]);

  // The same control sits at different positions in Buddy/hero/shop and RTL.
  // Keep its anchored panel readable even near a narrow viewport edge or at enlarged text.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const align = () => {
      panel.style.left = ''; panel.style.right = '';
      const rect = panel.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - 16 - rect.width));
      if (left !== rect.left) {
        // Move the layout box itself; a transform can retain its old scroll overflow.
        panel.style.left = `${panel.offsetLeft + left - rect.left}px`;
        panel.style.right = 'auto';
      }
    };
    align();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(align);
    observer?.observe(panel);
    window.addEventListener('resize', align);
    window.addEventListener('scroll', align, true);
    return () => { observer?.disconnect(); window.removeEventListener('resize', align); window.removeEventListener('scroll', align, true); };
  }, [phase, isRtl, placement]);

  const start = async () => {
    if (disabled || busy.current) return;
    window.dispatchEvent(new Event('allbarka:voice-start'));
    const version = ++generation.current;
    busy.current = true; setError(''); setDraft(''); setTruncated(false); setRemaining(VOICE_MAX_CAPTURE_SECONDS); setPhase('permission');
    window.speechSynthesis?.cancel();
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (version !== generation.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = capture;
      const chunks: Blob[] = []; let bytes = 0;
      capture.ondataavailable = event => {
        if (version !== generation.current || !event.data.size) return;
        bytes += event.data.size;
        if (bytes > VOICE_MAX_CAPTURE_BYTES) { fail('VOICE_AUDIO_TOO_LARGE'); return; }
        chunks.push(event.data);
      };
      const fail = (code: string) => {
        if (version !== generation.current) return;
        generation.current++; busy.current = false; release(); setError(code); setPhase('error');
      };
      capture.onerror = () => fail('VOICE_MIC_UNAVAILABLE');
      capture.onstop = async () => {
        if (version !== generation.current) return;
        clearTimeout(timer.current); clearInterval(countdown.current);
        media.getTracks().forEach(track => track.stop()); stream.current = null; recorder.current = null;
        setPhase('processing');
        const controller = new AbortController(); request.current = controller;
        // Preparation/token work has its own budget; upload gets a fresh deadline.
        deadline.current = setTimeout(() => fail('VOICE_TIMEOUT'), 15000);
        try {
          const prepared = await prepareVoiceAudio(new Blob(chunks, { type: capture.mimeType }), controller.signal);
          const token = await currentUser?.getIdToken();
          if (version !== generation.current || controller.signal.aborted) return;
          clearTimeout(deadline.current);
          deadline.current = setTimeout(() => fail('VOICE_TIMEOUT'), 25000);
          setTruncated(prepared.truncated);
          const text = await transcribeVoiceInput(prepared.audio, controller.signal, token);
          if (version !== generation.current || controller.signal.aborted) return;
          clearTimeout(deadline.current); request.current = null; busy.current = false;
          setDraft(text); setPhase('review');
        } catch (error) { fail(error instanceof Error ? error.message : 'VOICE_PROVIDER_UNAVAILABLE'); }
      };
      capture.start(250); setPhase('recording');
      const startedAt = performance.now();
      countdown.current = setInterval(() => setRemaining(Math.max(0, VOICE_MAX_CAPTURE_SECONDS - Math.floor((performance.now() - startedAt) / 1000))), 250);
      timer.current = setTimeout(() => {
        clearInterval(countdown.current); setRemaining(0);
        if (capture.state === 'recording') capture.stop();
        media.getTracks().forEach(track => track.stop());
      }, VOICE_MAX_CAPTURE_SECONDS * 1000);
    } catch (error) {
      if (version !== generation.current) return;
      generation.current++; busy.current = false; release();
      setError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'VOICE_MIC_DENIED' : 'VOICE_MIC_UNAVAILABLE'); setPhase('error');
    }
  };
  if (!supported) return null;
  const label = phase === 'recording' ? t('voice.stop') : phase === 'review' ? t('voice.cancel') : t('voice.start');
  const open = phase !== 'idle';
  const errors = ['VOICE_INVALID_AUDIO', 'VOICE_AUDIO_TOO_LARGE', 'VOICE_AUDIO_TOO_LONG', 'VOICE_NO_SPEECH', 'VOICE_QUOTA_EXCEEDED', 'VOICE_TIMEOUT', 'VOICE_MIC_DENIED', 'VOICE_MIC_UNAVAILABLE'];
  const errorKey = errors.includes(error) ? error : 'VOICE_PROVIDER_UNAVAILABLE';
  return <div data-voice-control className="relative shrink-0" dir={isRtl ? 'rtl' : 'ltr'}>
    <button ref={trigger} type="button" aria-label={label} title={label} aria-pressed={phase === 'recording'} aria-expanded={open} aria-controls={id}
      disabled={disabled || phase === 'permission' || phase === 'processing'}
      onClick={() => { if (phase === 'recording') recorder.current?.stop(); else if (phase === 'review') cancel(); else void start(); }}
      className={`focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-accent-text)] disabled:opacity-50 ${phase === 'recording' ? 'bg-[var(--color-surface-subtle)] ring-2 ring-[var(--color-gold)]' : 'bg-[var(--color-surface)]'}`}>
      {phase === 'permission' || phase === 'processing' ? <Loader2 size={18} className="motion-safe:animate-spin" /> : phase === 'recording' ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
    {open && <div ref={panelRef} id={id} role="region" aria-label={t('voice.panel')} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}
      className={`absolute ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} end-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-start text-sm text-[var(--color-text-primary)] shadow-xl`}>
      <div className="flex items-center justify-between gap-2"><span role={phase === 'error' ? 'alert' : 'status'}>{phase === 'error' ? t(`voice.${errorKey}`) : t(`voice.${phase}`)}</span>
        <button type="button" aria-label={t('voice.cancel')} onClick={cancel} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X size={17} /></button></div>
      {phase === 'permission' || phase === 'recording' ? <p className="mt-1 text-xs leading-relaxed">{t('voice.notice')}</p> : null}
      {phase === 'recording' && <span role="timer" aria-live="off" aria-label={t('voice.remaining')} className="mt-1 block font-mono tabular-nums" dir="ltr">0:{String(remaining).padStart(2, '0')}</span>}
      {phase === 'review' && <><label className="mt-2 block text-xs" htmlFor={`${id}-text`}>{t('voice.edit')}</label>
        {truncated && <p role="status" className="mt-2 text-xs">{t('voice.truncated')}</p>}
        <textarea id={`${id}-text`} dir="auto" value={draft} maxLength={VOICE_MAX_TRANSCRIPT_CHARS} aria-describedby={draft.trim().length > VOICE_INPUT_MAX_CHARS ? `${id}-length` : undefined} onChange={event => setDraft(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-2 text-base" />
        {draft.trim().length > VOICE_INPUT_MAX_CHARS && <p id={`${id}-length`} role="status" className="mt-1 text-xs">{t('voice.shorten')}</p>}
        <button type="button" disabled={!draft.trim() || draft.trim().length > VOICE_INPUT_MAX_CHARS} onClick={() => { if (!draft.trim() || draft.trim().length > VOICE_INPUT_MAX_CHARS) return; onTranscript(draft.trim()); cancel(); }} className="focus-ring mt-2 flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a2b] px-4 text-[#fff8e9] disabled:opacity-50"><Check size={16} />{t('voice.use')}</button></>}
      {phase === 'error' && <p className="mt-1 text-xs">{t('voice.typing')}</p>}
    </div>}
  </div>;
}
