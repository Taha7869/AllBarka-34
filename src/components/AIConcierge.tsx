import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Sparkles, 
  MapPin, 
  ExternalLink, 
  RefreshCw
} from 'lucide-react';
import { ChatMessage } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

interface AIConciergeProps {
  hide?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasCartBar?: boolean;
}

export default function AIConcierge({ hasCartBar = false, hide = false, onOpenChange }: AIConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chipsScrollRef = useDragScroll<HTMLDivElement>();

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);


  // Attempt to fetch user geolocation for Maps accuracy safely
  useEffect(() => {
    const fetchLocation = async () => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setUserLocation({ latitude: 31.5204, longitude: 74.3587 });
        return;
      }

      try {
        if (navigator.permissions && navigator.permissions.query) {
          const perm = await navigator.permissions.query({ name: 'geolocation' });
          if (perm.state === 'denied') {
            setUserLocation({ latitude: 31.5204, longitude: 74.3587 });
            return;
          }
        }
      } catch {
        // Continue if permissions query is unsupported
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {
          // Fallback to Lahore center coordinates
          setUserLocation({ latitude: 31.5204, longitude: 74.3587 });
        },
        { timeout: 4000, maximumAge: 300000 }
      );
    };

    fetchLocation();
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'model',
          text: 'Assalam-o-Alaikum & Welcome to AllBarka Luxury Boutique! I am your personal AI Sommelier. I can assist you with gourmet dry fruit recommendations, Lahore same-day dispatch timelines, custom gift caskets, or locating our flagship boutique in Lahore. How may I assist you today?'
        }
      ]);
    }
  }, [messages.length]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          location: userLocation,
          history: messages.slice(-8)
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        role: 'assistant',
        text: data.text || 'I apologize, I am temporarily unable to reach our boutique server. Please reach us directly via WhatsApp at 0316-0666083.',
        groundingSources: data.groundingSources || []
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Thank you for reaching out! You can place orders directly on this website, or connect with our master sommelier via WhatsApp at +92 316 0666083 for instant bespoke assistance in Lahore.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        text: 'Assalam-o-Alaikum & Welcome back to AllBarka! How may I assist you with your gourmet selection today?'
      }
    ]);
  };

  return (
    <>
      {/* ── Luxury Animated Floating Concierge Widget ─────────────────── */}
      <AnimatePresence>
        {(!hide && !isOpen) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-30 transition-all duration-300 pb-[env(safe-area-inset-bottom)] ${hasCartBar ? 'bottom-24 sm:bottom-[90px] right-4 sm:right-6' : 'bottom-5 sm:bottom-6 right-4 sm:right-6'}`}
          >
            {/* Soft Gold Glowing Pulse Rings */}
            <div className="absolute inset-0 rounded-full bg-[var(--color-gold,#B8935F)]/25 blur-md animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[var(--color-gold,#B8935F)]/40 via-[var(--color-gold-light,#D4B483)]/20 to-transparent blur-sm animate-pulse pointer-events-none" />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative w-[44px] h-[44px] sm:w-14 sm:h-14 rounded-full p-[1.5px] bg-gradient-to-br from-[var(--color-gold-light,#D4B483)] via-[var(--color-gold,#B8935F)] to-[var(--color-gold,#B8935F)] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer group select-none"
              title="AllBarka Luxury AI Concierge"
              aria-label="Open Luxury AI Concierge"
            >
              {/* Inner Core */}
              <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="absolute inset-[2px] rounded-full border border-[var(--color-gold,#B8935F)]/40 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(184,147,95,0.15),transparent_70%)] pointer-events-none" />
                {/* Monogram Seal Vector with 'AB' and 'AI' */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span className="font-serif font-black text-xs sm:text-sm tracking-tight text-[var(--color-gold,#B8935F)] drop-shadow-xs leading-none group-hover:scale-105 transition-transform">
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

      {/* ── Chat Concierge Sliding Drawer ─────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-[80px] sm:bottom-[90px] right-4 sm:right-6 z-50 origin-bottom-right w-[calc(100vw-2rem)] sm:w-[420px] h-[560px] max-h-[80vh] bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/35 rounded-[28px] shadow-lg flex flex-col overflow-hidden text-[var(--color-ink,#1A1A1A)]"
          >
            {/* Header */}
            <div className="bg-[var(--color-base,#FDFCFA)] p-3.5 sm:p-4 text-[var(--color-ink,#1A1A1A)] flex items-center justify-between border-b border-[var(--color-gold,#B8935F)]/25 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full p-[1px] bg-[var(--color-gold,#B8935F)] shadow-xs shrink-0">
                  <div className="w-full h-full rounded-full bg-[var(--color-surface,#FFFFFF)] flex items-center justify-center">
                    <span className="font-serif font-black text-xs text-[var(--color-gold,#B8935F)]">AB</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[var(--color-ink,#1A1A1A)] tracking-wide flex items-center gap-1.5">
                    AllBarka Concierge <Sparkles size={13} className="text-[var(--color-gold,#B8935F)]" />
                  </h3>
                  <p className="text-[10px] text-[var(--color-gold,#B8935F)] font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-ping inline-block" />
                    Gourmet Assistant & Lahore Delivery
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Reset conversation"
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] p-1.5 rounded-full hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] p-1.5 rounded-full hover:bg-[var(--color-cream,#FAF9F5)] transition-colors cursor-pointer"
                  aria-label="Close Concierge"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[var(--color-base,#FDFCFA)] scrollbar-thin">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-gold,#B8935F)] text-white rounded-br-none shadow-xs font-medium'
                        : 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] rounded-bl-none border border-[var(--color-gold,#B8935F)]/25 shadow-xs font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Google Maps Location Pins (if referenced) */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--color-gold,#B8935F)]/20 space-y-1">
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {msg.groundingSources.map((source, sIdx) => (
                            <a
                              key={sIdx}
                              href={source.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] bg-[var(--color-cream,#FAF9F5)] hover:bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] font-bold px-2.5 py-1 rounded-lg border border-[var(--color-gold,#B8935F)]/40 transition-colors shadow-2xs"
                            >
                              <MapPin size={11} className="text-[var(--color-gold,#B8935F)] shrink-0" />
                              <span className="max-w-[170px] truncate">{source.title || 'View on Google Maps'}</span>
                              <ExternalLink size={9} className="opacity-60 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] border border-[var(--color-gold,#B8935F)]/25 p-3 rounded-2xl rounded-bl-none flex items-center gap-2 text-xs font-semibold shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] text-[var(--color-ink-muted,#5A5A5A)] ml-1">
                      Consulting AllBarka Sommelier...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Action Chips */}
            <div 
              ref={chipsScrollRef}
              className="px-3 py-2 bg-[var(--color-cream,#FAF9F5)] border-t border-[var(--color-gold,#B8935F)]/20 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: 'pan-x' }}
            >
              {[
                { label: '📍 Store Location in Lahore', prompt: 'Where is the AllBarka flagship store located in Lahore?' },
                { label: '🚚 Delivery to DHA & Bahria', prompt: 'How fast is your delivery to DHA Phase 6 and Bahria Town Lahore?' },
                { label: '🌰 Best Pistachios & Almonds', prompt: 'Tell me about the quality and pricing of your roasted Pistachios and Golden Almonds.' },
                { label: '🎁 Gift Box Recommendations', prompt: 'Which luxury combo or gift deal is best for corporate or family gifting?' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, item.prompt)}
                  className="text-[10px] font-semibold text-[var(--color-ink,#1A1A1A)] bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-[var(--color-gold,#B8935F)] hover:text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-[var(--color-surface,#FFFFFF)] border-t border-[var(--color-gold,#B8935F)]/20 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about dry fruits, gift boxes, or Lahore delivery..."
                className="flex-1 bg-[var(--color-cream,#FAF9F5)] text-xs text-[var(--color-ink,#1A1A1A)] placeholder:text-[var(--color-ink-muted,#5A5A5A)] px-3.5 py-2.5 rounded-full border border-[var(--color-gold,#B8935F)]/30 focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-[var(--color-gold,#B8935F)] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[var(--color-gold-light,#D4B483)] transition-colors cursor-pointer shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
