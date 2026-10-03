import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { 
  X, 
  Send, 
  Sparkles, 
  RefreshCw,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDragScroll } from '../hooks/useDragScroll';
import { useLanguage } from '../contexts/LanguageContext';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import type { ChatMessage } from '../services/aiConcierge';

interface AIConciergeProps {
  hide?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasCartBar?: boolean;
}

export default function AIConcierge({ hasCartBar = false, hide = false, onOpenChange }: AIConciergeProps) {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [greeting, setGreeting] = useState<'welcome' | 'reset'>('welcome');
  const [streamingText, setStreamingText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [serviceLoaded, setServiceLoaded] = useState(false);
  const aiServiceRef = useRef<typeof import('../services/aiConcierge') | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const lastFailedTextRef = useRef('');
  const previouslyOpenRef = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chipsScrollRef = useDragScroll<HTMLDivElement>();
  const displayMessages: ChatMessage[] = [
    { role: 'assistant', content: t(`concierge.${greeting}`) },
    ...messages,
  ];

  useEffect(() => {
    onOpenChange?.(isOpen);
    if (previouslyOpenRef.current && !isOpen) launcherRef.current?.focus();
    previouslyOpenRef.current = isOpen;
  }, [isOpen, onOpenChange]);
  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, streamingText, isOpen, reducedMotion]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  // Keep the AI service out of the initial storefront bundle.
  useEffect(() => {
    if (!isOpen || serviceLoaded) return;
    let cancelled = false;
    import('../services/aiConcierge').then(module => {
      if (cancelled) return;
      aiServiceRef.current = module;
      setServiceLoaded(true);
    }).catch(() => { if (!cancelled) setIsOffline(true); });
    return () => { cancelled = true; };
  }, [isOpen, serviceLoaded]);

  const handleSendMessage = async (event?: React.FormEvent, customText?: string, retry = false) => {
    event?.preventDefault();
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || sendingRef.current) return;
    sendingRef.current = true;
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const conversation = retry ? messages : [...messages, userMsg];
    if (!retry) setMessages(conversation);
    if (!customText) setInputText('');
    setIsLoading(true);
    setIsOffline(false);
    setStreamingText('');
    const controller = new AbortController();
    requestRef.current = controller;
    let responseText = '';

    try {
      if (!aiServiceRef.current) {
        aiServiceRef.current = await import('../services/aiConcierge');
        setServiceLoaded(true);
      }
      await aiServiceRef.current.chatWithOllama(
        conversation.filter(message => message.role !== 'system').slice(-10),
        language,
        chunk => {
          if (controller.signal.aborted) return;
          responseText += chunk;
          setStreamingText(responseText);
        },
        await currentUser?.getIdToken(),
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { role: 'assistant', content: responseText }]);
        setStreamingText('');
        lastFailedTextRef.current = '';
      }
    } catch {
      if (!controller.signal.aborted) {
        lastFailedTextRef.current = textToSend;
        setStreamingText('');
        setIsOffline(true);
      }
    } finally {
      sendingRef.current = false;
      if (!controller.signal.aborted) setIsLoading(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const clearChat = () => {
    if (sendingRef.current) return;
    setMessages([]);
    setGreeting('reset');
    setIsOffline(false);
    setStreamingText('');
    lastFailedTextRef.current = '';
  };

  return (
    <>
      <AnimatePresence>
        {(!hide && !isOpen) && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-24 sm:bottom-[90px] right-4 sm:right-6' : 'bottom-5 sm:bottom-6 right-4 sm:right-6'}`}
          >
            <div className="absolute inset-0 rounded-full bg-[var(--color-gold,#B8935F)]/25 blur-md motion-safe:animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            <button
              ref={launcherRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-[44px] h-[44px] sm:w-14 sm:h-14 rounded-full p-[1.5px] bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] via-[var(--color-gold,#B8935F)] to-[var(--color-gold,#B8935F)] shadow-lg hover:shadow-xl transition-all duration-300 motion-safe:hover:scale-110 motion-safe:active:scale-95 cursor-pointer group select-none"
              title={t('concierge.title')}
              aria-label={t('concierge.open')}
              aria-expanded={isOpen}
              aria-controls="allbarka-concierge-panel"
            >
              <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-[2px] rounded-full border border-[var(--color-gold,#B8935F)]/40 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="font-serif font-black text-xs sm:text-sm tracking-tight text-[var(--color-gold,#B8935F)] leading-none motion-safe:group-hover:scale-105 transition-transform">
                    AB
                  </span>
                  <span className="text-[6.5px] font-black uppercase tracking-widest text-[var(--color-ink,#1A1A1A)] leading-none mt-0.5 opacity-90 flex items-center gap-0.5">
                    <Sparkles size={6} className="text-[var(--color-gold,#B8935F)]" />
                    AI
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }}
            transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
            id="allbarka-concierge-panel"
            role="dialog"
            aria-label={t('concierge.title')}
            dir="ltr"
            className={`fixed bottom-[80px] sm:bottom-[90px] right-4 sm:right-6 z-50 origin-bottom flex flex-col overflow-hidden text-[var(--color-ink,#1A1A1A)] bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/35 rounded-[32px] sm:rounded-[28px] shadow-2xl
              w-[calc(100vw-2rem)] h-[calc(100dvh-140px)] sm:w-[380px] sm:h-[560px] sm:max-h-[80vh]`}
          >
            {/* Header */}
            <div className="bg-[var(--color-base,#FDFCFA)] p-3.5 sm:p-4 border-b border-[var(--color-gold,#B8935F)]/25 flex items-center justify-between shrink-0">
              <div className="min-w-0 flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[1px] bg-[var(--color-gold,#B8935F)] flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center">
                    <span className="font-serif font-black text-xs text-[var(--color-gold,#B8935F)]">AB</span>
                  </div>
                </div>
                <div dir="auto" className="min-w-0">
                  <h3 className="text-[13px] sm:text-sm font-serif font-bold flex items-center gap-1.5">
                    {t('concierge.title')} <Sparkles size={13} className="text-[var(--color-gold,#B8935F)]" />
                  </h3>
                  <p className="text-[10px] text-[var(--color-ink-muted,#5A5A5A)] font-bold flex items-center gap-1 mt-0.5">
                    {!isOffline && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] motion-safe:animate-ping inline-block" />}
                    {isOffline ? t('concierge.offline') : t('concierge.assistant')}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
                  disabled={isLoading}
                  aria-label={t('clearChat', 'Clear Chat')}
                  title={t('clearChat', 'Clear Chat')}
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] min-w-11 min-h-11 flex items-center justify-center rounded-full disabled:opacity-40 hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  aria-label={t('close', 'Close')}
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] min-w-11 min-h-11 flex items-center justify-center rounded-full disabled:opacity-40 hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-base,#FAF9F5)] scrollbar-thin">
              {displayMessages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] to-[var(--color-gold,#B8935F)] text-[#29231D] rounded-br-none'
                      : 'bg-[var(--color-primary,#1E3A2B)] text-white rounded-bl-none'}`
                  }>
                    <p dir="auto" className="whitespace-pre-wrap text-start">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {streamingText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm bg-[var(--color-primary,#1E3A2B)] text-white rounded-bl-none">
                    <p dir="auto" className="whitespace-pre-wrap text-start">{streamingText}</p>
                  </div>
                </div>
              )}

              {isLoading && !streamingText && !isOffline && (
                <div className="flex w-full justify-start">
                  <div role="status" aria-label={t('concierge.thinking')} className="bg-[var(--color-primary,#1E3A2B)] text-white p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] motion-safe:animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] motion-safe:animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] motion-safe:animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {isOffline && (
                <div className="flex w-full justify-start">
                  <div className="bg-[var(--color-surface,#FFFFFF)] border border-red-200 p-3.5 rounded-2xl rounded-bl-none shadow-sm flex flex-col gap-3">
                    <p className="text-[13px] text-red-800 dark:text-red-200 flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <span dir="auto">{t('conciergeOffline', 'Our concierge is resting. Please reach us on WhatsApp for assistance.')}</span>
                    </p>
                    <div className="flex items-center gap-2">
                       <a
                        href={buildHumanSupportWhatsAppUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 text-xs font-bold min-h-11 text-white bg-[#126A43] px-4 py-2 rounded-xl hover:bg-[#0D5133] transition-colors"
                      >
                        <MessageCircle size={14} />
                        {t('whatsappContact', 'Connect on WhatsApp')}
                      </a>
                      <button 
                        type="button"
                        disabled={isLoading || !lastFailedTextRef.current}
                        onClick={() => handleSendMessage(undefined, lastFailedTextRef.current, true)}
                        className="min-h-11 text-xs font-bold text-[var(--color-ink,#1A1A1A)] disabled:opacity-40 px-3 py-2 border border-[var(--color-gold,#B8935F)] rounded-xl hover:bg-[var(--color-gold,#B8935F)] hover:text-[#29231D] transition-colors"
                      >
                        {t('retry', 'Retry')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div 
              ref={chipsScrollRef}
              className="px-3 py-2.5 border-t border-[var(--color-gold,#B8935F)]/20 bg-[var(--color-cream,#FAF9F5)] flex gap-2 overflow-x-auto no-scrollbar shrink-0 select-none pb-[14px]"
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            >
              {[
                { label: `📍 ${t('concierge.location')}`, prompt: t('concierge.locationPrompt') },
                { label: `🚚 ${t('concierge.delivery')}`, prompt: t('concierge.deliveryPrompt') },
                { label: `🎁 ${t('concierge.gifts')}`, prompt: t('concierge.giftsPrompt') },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  dir="auto"
                  onClick={() => handleSendMessage(undefined, item.prompt)}
                  disabled={isLoading || isOffline}
                  className="min-h-11 text-[11px] font-semibold text-[var(--color-ink,#1A1A1A)] bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-[var(--color-primary,#1E3A2B)] hover:text-white transition-colors disabled:opacity-50 shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-[var(--color-surface,#FFFFFF)] border-t border-[var(--color-gold,#B8935F)]/20 flex gap-2 shrink-0">
              <input
                type="text"
                maxLength={1000}
                autoComplete="off"
                enterKeyHint="send"
                aria-label={t('concierge.message')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('typeMessage', 'Type your message...')}
                disabled={isLoading || isOffline}
                className="min-w-0 min-h-11 flex-1 bg-[var(--color-cream,#FAF9F5)] text-base sm:text-[13px] text-[var(--color-ink,#1A1A1A)] placeholder:text-[var(--color-ink-muted,#5A5A5A)] px-4 py-2.5 rounded-full border border-[var(--color-gold,#B8935F)]/30 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]"
                dir="auto"
              />
              <button
                type="submit"
                aria-label={t('concierge.send')}
                disabled={!inputText.trim() || isLoading || isOffline}
                className="w-11 h-11 rounded-full bg-[var(--color-gold,#B8935F)] text-[#29231D] flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition-all motion-safe:active:scale-95 shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
