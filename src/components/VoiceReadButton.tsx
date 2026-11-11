import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function VoiceReadButton({ text }: { text: string }) {
  const { language, t } = useLanguage();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(synth.getVoices()); update();
    const stop = () => { synth.cancel(); setSpeaking(false); };
    synth.addEventListener('voiceschanged', update);
    window.addEventListener('allbarka:voice-start', stop);
    window.addEventListener('allbarka:voice-cancel', stop);
    return () => { synth.removeEventListener('voiceschanged', update); window.removeEventListener('allbarka:voice-start', stop); window.removeEventListener('allbarka:voice-cancel', stop); synth.cancel(); };
  }, []);
  useEffect(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, [text, language]);
  const voice = voices.find(item => item.lang.toLowerCase().split(/[-_]/)[0] === language);
  // Do not pass Roman Urdu to an English voice as a fake Urdu fallback.
  const scriptMatches = language === 'en' ? !/[\u0600-\u06ff]/.test(text) : /[\u0600-\u06ff]/.test(text);
  if (!voice || !scriptMatches || !text.trim()) return null;
  return <button type="button" aria-label={t(speaking ? 'voice.mute' : 'voice.listen')} aria-pressed={speaking}
    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-[var(--color-accent-text)]"
    onClick={() => {
      const synth = window.speechSynthesis; synth.cancel();
      if (speaking) { setSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 4000)); utterance.voice = voice; utterance.lang = voice.lang;
      utterance.onend = utterance.onerror = () => setSpeaking(false); utterance.onstart = () => setSpeaking(true); synth.speak(utterance);
    }}>{speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}{t(speaking ? 'voice.mute' : 'voice.listen')}</button>;
}
