import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Sparkles, HelpCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  badge?: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-freshness',
    question: 'How do you guarantee freshness?',
    answer:
      'Every batch is meticulously hand-sorted and immediately vacuum-sealed to lock in natural oils, crunch, and authentic flavor.',
    badge: 'Purity & Grade'
  },
  {
    id: 'faq-vacuum',
    question: 'What is the benefit of Vacuum Sealing?',
    answer:
      'It is an advanced oxygen-free packaging process that completely prevents staleness, ensuring peak harvest quality upon arrival.',
    badge: 'Packaging Tech'
  },
  {
    id: 'faq-wholesale',
    question: 'How does wholesale ordering work?',
    answer:
      'We offer dedicated bulk pricing starting at a minimum of 3KG, with seamless 1KG increments for your convenience.',
    badge: 'Wholesale Tier'
  }
];

export function FAQSection() {
  // First item expanded by default as requested
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 sm:py-24 bg-[var(--color-base)] text-[var(--color-ink)] relative overflow-hidden select-none border-t border-[var(--color-border)]">
      {/* ── Background Ambient Radial Glows ───────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[var(--color-gold)]/[0.08] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[var(--color-gold)]/[0.04] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Section Header ────────────────────────────────────────────── */}
        <div className="text-center space-y-3.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-gold)]/40 text-[var(--color-gold)] text-[10.5px] font-black uppercase tracking-[0.25em] shadow-xs">
            <Sparkles size={12} className="text-[var(--color-gold)]" />
            <span>Frequently Asked Questions</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-[var(--color-ink)] leading-tight">
            Clarity on <span className="text-[var(--color-gold)]">Quality & Sourcing</span>
          </h2>

          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-xl mx-auto leading-relaxed font-medium">
            Everything you need to know about our artisanal hand-sorting standards, oxygen-free vacuum sealing, and transparent wholesale tier.
          </p>

          <div className="h-0.5 w-16 bg-[var(--color-gold)] mx-auto mt-4 rounded-full" />
        </div>

        {/* ── Accordion List ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'bg-[var(--color-surface)] border-[var(--color-gold)] shadow-md'
                    : 'bg-[var(--color-surface)]/80 border-[var(--color-border)] hover:border-[var(--color-gold)]/60 hover:bg-[var(--color-surface)] shadow-xs'
                }`}
              >
                {/* Header / Question Button */}
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="w-full p-4 sm:p-6 flex items-start sm:items-center justify-between gap-3 sm:gap-4 text-left cursor-pointer transition-colors focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex min-w-0 items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    {/* Numbering / Icon Tag */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isOpen
                          ? 'bg-[var(--color-emerald)] text-[var(--color-gold)] border-[var(--color-gold)] font-black shadow-xs'
                          : 'bg-[var(--color-base)] text-[var(--color-gold)] border-[var(--color-border)] font-bold'
                      }`}
                    >
                      <span className="font-serif text-xs sm:text-sm">0{index + 1}</span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      {faq.badge && (
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-[var(--color-gold)] block">
                          {faq.badge}
                        </span>
                      )}
                      <h3
                        className={`text-sm sm:text-base md:text-lg font-serif font-bold transition-colors break-words ${
                          isOpen ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink)]/90'
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  {/* Expand Chevron */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                      isOpen
                        ? 'bg-[var(--color-emerald)] text-[var(--color-gold)] border-[var(--color-gold)] rotate-180'
                        : 'bg-[var(--color-base)] text-[var(--color-gold)] border-[var(--color-border)] hover:border-[var(--color-gold)]'
                    }`}
                  >
                    <ChevronDown size={16} strokeWidth={2.5} />
                  </div>
                </button>

                {/* Body / Answer */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 sm:px-6 sm:pb-7 pt-1 border-t border-[var(--color-border)] text-left">
                        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--color-base)] border border-[var(--color-border)] text-xs sm:text-sm md:text-[14.5px] text-[var(--color-ink)] font-medium leading-relaxed sm:leading-loose break-words">
                          <p>{faq.answer}</p>
                          
                          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--color-gold)]">
                            <CheckCircle2 size={13} className="text-[var(--color-gold)]" />
                            <span>Verified AllBarka Standard</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ── Footer Support Banner ─────────────────────────────────────── */}
        <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-gold)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] text-[var(--color-gold)] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--color-ink)]">
                Have a bespoke inquiry or bulk request?
              </h4>
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                Our Lahore boutique sommelier is available on WhatsApp daily (09 AM - 09 PM).
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/923160666083"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)] border border-[var(--color-gold)]/60 hover:bg-[var(--color-gold)] hover:text-[var(--color-emerald)] text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm shrink-0 cursor-pointer"
          >
            Chat With Concierge
          </a>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
