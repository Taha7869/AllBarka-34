import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, X, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { prepareVoiceAudio, transcribeVoiceInput } from '../services/voiceInput';

type Phase = 'idle' | 'permission' | 'recording' | 'processing' | 'review' | 'error';
export default function VoiceInputButton({ onTranscript, disabled = false, placement = 'below' }: { onTranscript: (text: string) => void; disabled?: boolean; placement?: 'above' | 'below' }) {
  const { t, isRtl } = useLanguage();
  const { currentUser } = useAuth();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const busy = useRef(false);

  const release = useCallback(() => {
    clearTimeout(timer.current); clearTimeout(deadline.current);
    request.current?.abort(); request.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
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
    document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('allbarka:voice-start', stop); document.removeEventListener('visibilitychange', hide); };
  }, [release]);

  const start = async () => {
    if (disabled || busy.current) return;
    window.dispatchEvent(new Event('allbarka:voice-start'));
    const version = ++generation.current;
    busy.current = true; setError(''); setDraft(''); setPhase('permission');
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
        if (bytes > 2 * 1024 * 1024) { fail('VOICE_AUDIO_TOO_LARGE'); return; }
        chunks.push(event.data);
      };
      const fail = (code: string) => {
        if (version !== generation.current) return;
        generation.current++; busy.current = false; release(); setError(code); setPhase('error');
      };
      capture.onerror = () => fail('VOICE_MIC_UNAVAILABLE');
      capture.onstop = async () => {
        if (version !== generation.current) return;
        clearTimeout(timer.current);
        media.getTracks().forEach(track => track.stop()); stream.current = null; recorder.current = null;
        setPhase('processing');
        const controller = new AbortController(); request.current = controller;
        deadline.current = setTimeout(() => fail('VOICE_TIMEOUT'), 25000);
        try {
          const audio = await prepareVoiceAudio(new Blob(chunks, { type: capture.mimeType }), controller.signal);
          const token = await currentUser?.getIdToken();
          if (version !== generation.current || controller.signal.aborted) return;
          const text = await transcribeVoiceInput(audio, controller.signal, token);
          if (version !== generation.current || controller.signal.aborted) return;
          clearTimeout(deadline.current); request.current = null; busy.current = false;
          setDraft(text); setPhase('review');
        } catch (error) { fail(error instanceof Error ? error.message : 'VOICE_PROVIDER_UNAVAILABLE'); }
      };
      capture.start(250); setPhase('recording');
      // Leave room for codec tail frames; the server verifies the real PCM duration <=15s.
      timer.current = setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, 14000);
    } catch (error) {
      if (version !== generation.current) return;
      generation.current++; busy.current = false; release();
      setError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'VOICE_MIC_DENIED' : 'VOICE_MIC_UNAVAILABLE'); setPhase('error');
    }
  };
  if (!supported) return null;
  const label = phase === 'recording' ? t('voice.stop') : phase === 'review' ? t('voice.cancel') : t('voice.start');
  const open = phase !== 'idle';
  const errors = ['VOICE_AUDIO_TOO_LARGE', 'VOICE_AUDIO_TOO_LONG', 'VOICE_NO_SPEECH', 'VOICE_QUOTA_EXCEEDED', 'VOICE_TIMEOUT', 'VOICE_MIC_DENIED', 'VOICE_MIC_UNAVAILABLE'];
  const errorKey = errors.includes(error) ? error : 'VOICE_PROVIDER_UNAVAILABLE';
  return <div data-voice-control className="relative shrink-0" dir={isRtl ? 'rtl' : 'ltr'}>
    <button ref={trigger} type="button" aria-label={label} title={label} aria-pressed={phase === 'recording'} aria-expanded={open} aria-controls={id}
      disabled={disabled || phase === 'permission' || phase === 'processing'}
      onClick={() => { if (phase === 'recording') recorder.current?.stop(); else if (phase === 'review') cancel(); else void start(); }}
      className={`focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-accent-text)] disabled:opacity-50 ${phase === 'recording' ? 'bg-[var(--color-surface-subtle)] ring-2 ring-[var(--color-gold)]' : 'bg-[var(--color-surface)]'}`}>
      {phase === 'permission' || phase === 'processing' ? <Loader2 size={18} className="motion-safe:animate-spin" /> : phase === 'recording' ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
    {open && <div id={id} role="region" aria-label={t('voice.panel')} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}
      className={`absolute ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} end-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-start text-sm text-[var(--color-text-primary)] shadow-xl`}>
      <div className="flex items-center justify-between gap-2"><span role={phase === 'error' ? 'alert' : 'status'}>{phase === 'error' ? t(`voice.${errorKey}`) : t(`voice.${phase}`)}</span>
        <button type="button" aria-label={t('voice.cancel')} onClick={cancel} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X size={17} /></button></div>
      {phase === 'permission' || phase === 'recording' ? <p className="mt-1 text-xs leading-relaxed">{t('voice.notice')}</p> : null}
      {phase === 'review' && <><label className="mt-2 block text-xs" htmlFor={`${id}-text`}>{t('voice.edit')}</label>
        <textarea id={`${id}-text`} dir="auto" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-2 text-base" />
        <button type="button" disabled={!draft.trim()} onClick={() => { onTranscript(draft.trim()); cancel(); }} className="focus-ring mt-2 flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a2b] px-4 text-[#fff8e9] disabled:opacity-50"><Check size={16} />{t('voice.use')}</button></>}
      {phase === 'error' && <p className="mt-1 text-xs">{t('voice.typing')}</p>}
    </div>}
  </div>;
}
