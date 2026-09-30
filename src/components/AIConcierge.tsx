import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl } from '../config/contacts';
import type { ChatMessage } from '../services/aiConcierge';

interface AIConciergeProps {
  hide?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasCartBar?: boolean;
}

export default function AIConcierge({ hasCartBar = false, hide = false, onOpenChange }: AIConciergeProps) {
  const { currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [serviceLoaded, setServiceLoaded] = useState(false);
  const aiServiceRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chipsScrollRef = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: isRtl 
            ? 'السلام علیکم! آل برکہ لگژری بوتیک میں خوش آمدید۔ میں آپ کا ذاتی اے آئی دربان ہوں۔ میں آپ کو خشک میوہ جات کی تجاویز اور ترسیل کے حوالے سے رہنمائی کر سکتا ہوں۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟'
            : 'Assalam-o-Alaikum & Welcome to AllBarka Luxury Boutique! I am your personal AI Sommelier. I can assist you with gourmet dry fruit recommendations, Lahore same-day dispatch timelines, or custom gift caskets. How may I assist you today?'
        }
      ]);
    }
  }, [messages.length, isRtl]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText, isOpen]);

  // Lazy load service when chat is opened
  useEffect(() => {
    if (isOpen && !serviceLoaded) {
      import('../services/aiConcierge').then(module => {
        aiServiceRef.current = module;
        setServiceLoaded(true);
      }).catch(() => {
        setIsOffline(true);
      });
    }
  }, [isOpen, serviceLoaded]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    
    setIsLoading(true);
    setIsOffline(false);
    setStreamingText('');

    try {
      if (!aiServiceRef.current) {
        aiServiceRef.current = await import('../services/aiConcierge');
        setServiceLoaded(true);
      }

      await aiServiceRef.current.chatWithOllama(
        [...messages, userMsg].filter(m => m.role !== 'system').slice(-10),
        isRtl,
        (chunk: string) => {
          setStreamingText(prev => prev + chunk);
        }
      );

      // On finish, push streaming text to messages and reset stream state
      setStreamingText(prev => {
        if (prev) {
          setMessages(msgs => [...msgs, { role: 'assistant', content: prev }]);
        }
        return '';
      });

    } catch (error) {
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: isRtl 
          ? 'السلام علیکم! آپ کی واپسی پر خوش آمدید۔ آج میں آپ کی کیا مدد کر سکتا ہوں؟'
          : 'Assalam-o-Alaikum & Welcome back to AllBarka! How may I assist you with your gourmet selection today?'
      }
    ]);
    setIsOffline(false);
    setStreamingText('');
  };

  return (
    <>
      <AnimatePresence>
        {(!hide && !isOpen) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-24 sm:bottom-[90px] end-4 sm:end-6' : 'bottom-5 sm:bottom-6 end-4 sm:end-6'}`}
          >
            <div className="absolute inset-0 rounded-full bg-[var(--color-gold,#B8935F)]/25 blur-md animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-[44px] h-[44px] sm:w-14 sm:h-14 rounded-full p-[1.5px] bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] via-[var(--color-gold,#B8935F)] to-[var(--color-gold,#B8935F)] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer group select-none"
              title="AllBarka Luxury AI Concierge"
              aria-label="Open Luxury AI Concierge"
            >
              <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-[2px] rounded-full border border-[var(--color-gold,#B8935F)]/40 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="font-serif font-black text-xs sm:text-sm tracking-tight text-[var(--color-gold,#B8935F)] leading-none group-hover:scale-105 transition-transform">
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
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed bottom-[80px] sm:bottom-[90px] end-4 sm:end-6 z-50 origin-bottom flex flex-col overflow-hidden text-[var(--color-ink,#1A1A1A)] bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/35 rounded-[32px] sm:rounded-[28px] shadow-2xl
              w-[calc(100vw-2rem)] h-[calc(100vh-140px)] sm:w-[380px] sm:h-[560px] sm:max-h-[80vh]`}
          >
            {/* Header */}
            <div className="bg-[var(--color-base,#FDFCFA)] p-3.5 sm:p-4 border-b border-[var(--color-gold,#B8935F)]/25 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full p-[1px] bg-[var(--color-gold,#B8935F)] flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center">
                    <span className="font-serif font-black text-xs text-[var(--color-gold,#B8935F)]">AB</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold tracking-wide flex items-center gap-1.5">
                    AllBarka Concierge <Sparkles size={13} className="text-[var(--color-gold,#B8935F)]" />
                  </h3>
                  <p className="text-[10px] text-[var(--color-gold,#B8935F)] font-bold flex items-center gap-1 mt-0.5">
                    {!isOffline && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-ping inline-block" />}
                    {isOffline ? 'Offline' : 'Gourmet Assistant'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title={t('clearChat', 'Clear Chat')}
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] p-1.5 rounded-full hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] p-1.5 rounded-full hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-base,#FAF9F5)] scrollbar-thin">
              {messages.map((msg, index) => (
                <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm
                    ${msg.role === 'user' 
                      ? 'bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] to-[var(--color-gold,#B8935F)] text-white rounded-be-none' 
                      : 'bg-[var(--color-primary,#1E3A2B)] text-white rounded-bs-none'}`
                  }>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {streamingText && (
                <div className="flex w-full justify-start">
                  <div className="max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm bg-[var(--color-primary,#1E3A2B)] text-white rounded-bs-none">
                    <p className="whitespace-pre-wrap">{streamingText}</p>
                  </div>
                </div>
              )}

              {isLoading && !streamingText && !isOffline && (
                <div className="flex w-full justify-start">
                  <div className="bg-[var(--color-primary,#1E3A2B)] text-white p-3 rounded-2xl rounded-bs-none flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {isOffline && (
                <div className="flex w-full justify-start">
                  <div className="bg-[var(--color-surface,#FFFFFF)] border border-red-200 p-3.5 rounded-2xl rounded-bs-none shadow-sm flex flex-col gap-3">
                    <p className="text-[13px] text-red-900 flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <span>{t('conciergeOffline', 'Our concierge is resting. Please reach us on WhatsApp for assistance.')}</span>
                    </p>
                    <div className="flex items-center gap-2">
                       <a
                        href={buildHumanSupportWhatsAppUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-[#25D366] px-4 py-2 rounded-xl hover:bg-[#1DA851] transition-colors"
                      >
                        <MessageCircle size={14} />
                        {t('whatsappContact', 'Connect on WhatsApp')}
                      </a>
                      <button 
                        onClick={() => handleSendMessage(undefined, messages[messages.length-1]?.content)}
                        className="text-xs font-bold text-[var(--color-gold,#B8935F)] px-3 py-2 border border-[var(--color-gold,#B8935F)] rounded-xl hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-colors"
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
              style={{ touchAction: 'pan-x' }}
            >
              {[
                { label: '📍 Store Location', prompt: 'Where is the AllBarka flagship store located in Lahore?' },
                { label: '🚚 Delivery Timings', prompt: 'How fast is your delivery across Lahore and Pakistan?' },
                { label: '🎁 Gift Recommendations', prompt: 'What luxury gift sets do you recommend for weddings?' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, item.prompt)}
                  disabled={isLoading || isOffline}
                  className="text-[11px] font-semibold text-[var(--color-ink,#1A1A1A)] bg-white border border-[var(--color-gold,#B8935F)]/30 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-colors disabled:opacity-50 shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-white border-t border-[var(--color-gold,#B8935F)]/20 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('typeMessage', 'Type your message...')}
                disabled={isLoading || isOffline}
                className="flex-1 bg-[var(--color-cream,#FAF9F5)] text-[13px] text-[var(--color-ink,#1A1A1A)] placeholder:text-[var(--color-ink-muted,#5A5A5A)] px-4 py-2.5 rounded-full border border-[var(--color-gold,#B8935F)]/30 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold,#B8935F)]"
                dir="auto"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || isOffline}
                className="w-10 h-10 rounded-full bg-[var(--color-gold,#B8935F)] text-white flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition-all active:scale-95 shrink-0"
              >
                <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
