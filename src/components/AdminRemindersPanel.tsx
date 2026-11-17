import React, { useEffect, useState } from 'react';
import { CalendarHeart, MessageCircle, ExternalLink, RefreshCw, Gift, Clock, User, Sparkles, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { adminRequest } from '../lib/adminClient';
import type { UpcomingReminderAdminRow } from '../lib/occasionReminders';

export default function AdminRemindersPanel() {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [reminders, setReminders] = useState<UpcomingReminderAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    adminRequest<{ count: number; reminders: UpcomingReminderAdminRow[] }>(
      () => currentUser.getIdToken(),
      '/api/admin/reminders/upcoming',
      { signal: controller.signal }
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setReminders(data.reminders || []);
        }
      })
      .catch((err: any) => {
        if (!controller.signal.aborted) {
          setError(err.message || 'Failed to load upcoming reminders');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentUser, refreshIndex]);

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getUrgencyBadge = (days: number) => {
    if (days === 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Aaj (Today)</span>;
    }
    if (days === 1) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Kal (Tomorrow)</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{days} din baaqi</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[var(--color-gold,#B8935F)]/30 bg-[#FDFBF7] dark:bg-[#1A201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60">Is Hafte Ke Reminders</span>
            <CalendarHeart size={18} className="text-[var(--color-gold,#B8935F)]" />
          </div>
          <p className="text-2xl font-serif font-black mt-2 text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
            {loading ? '...' : reminders.length}
          </p>
          <p className="text-[11px] text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 mt-0.5">
            Agley 7 dinon mein aane wale mauqe
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-gold,#B8935F)]/30 bg-[#FDFBF7] dark:bg-[#1A201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60">Manual Concierge</span>
            <MessageCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium mt-2 text-emerald-700 dark:text-emerald-400">
            WhatsApp Direct Click-to-Chat
          </p>
          <p className="text-[11px] text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 mt-0.5">
            Koi auto-bot nahi; har paigham admin khud bhejta hai
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-gold,#B8935F)]/30 bg-[#FDFBF7] dark:bg-[#1A201E] flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60">Action</span>
          <button
            type="button"
            onClick={() => setRefreshIndex((i) => i + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded-lg bg-[var(--color-gold,#B8935F)] text-white text-xs font-bold hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            List Taaza Karein
          </button>
        </div>
      </div>

      {/* Main List */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[var(--color-gold,#B8935F)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-3" />
          <p className="text-sm font-medium">Reminders dhoondhe ja rahe hain...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--color-gold,#B8935F)]/20 bg-white dark:bg-[#1A201E]">
          <CalendarHeart size={36} className="mx-auto text-[var(--color-gold,#B8935F)] mb-3 opacity-60" />
          <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
            Is hafte koi reminder scheduled nahi hai
          </h3>
          <p className="text-xs text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 mt-1 max-w-md mx-auto">
            Jab patrons apne account mein salgirah, shaadi ya Eid ki tareekhain save karenge, to tareekh se 7 din pehle woh yahan dikhenge.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((row) => (
            <div
              key={row.reminderId}
              className="p-5 rounded-2xl border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-black text-lg text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                      {row.recipientName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-gold,#B8935F)]/10 text-[var(--color-gold,#B8935F)] font-semibold">
                      {row.relationship}
                    </span>
                    {getUrgencyBadge(row.daysRemaining)}
                  </div>

                  <p className="text-xs text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mt-1 flex items-center gap-2">
                    <Clock size={13} className="text-[var(--color-gold,#B8935F)]" />
                    <span><strong>Mauqa:</strong> {row.occasionType === 'other' ? row.customOccasion || 'Special Day' : row.occasionType}</span>
                    <span>•</span>
                    <span><strong>Tareekh:</strong> {row.targetDateFormatted}</span>
                  </p>

                  <p className="text-xs text-[var(--color-ink,#1F120F)]/80 dark:text-[#FDFBF7]/80 mt-1 flex items-center gap-2">
                    <User size={13} className="text-[var(--color-gold,#B8935F)]" />
                    <span><strong>Customer:</strong> {row.customerName} ({row.customerPhone || 'Phone unavailable'})</span>
                  </p>

                  {row.notes && (
                    <p className="text-xs italic text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 mt-1 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/50">
                      Note: "{row.notes}"
                    </p>
                  )}
                </div>

                {/* WhatsApp Action */}
                <div className="flex flex-col sm:items-end gap-2">
                  <a
                    href={row.whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <MessageCircle size={16} />
                    WhatsApp Greeting Bhejein
                    <ExternalLink size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={() => copyMessage(row.reminderId, row.prefilledMessage)}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 hover:text-[var(--color-gold,#B8935F)] underline"
                  >
                    {copiedId === row.reminderId ? (
                      <>
                        <Check size={13} className="text-emerald-600" />
                        Message copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        Message text copy karein
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3 Curated Gift Suggestions */}
              <div className="mt-4 pt-4 border-t border-[var(--color-gold,#B8935F)]/15">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink,#1F120F)]/60 dark:text-[#FDFBF7]/60 mb-2 flex items-center gap-1.5">
                  <Gift size={13} className="text-[var(--color-gold,#B8935F)]" />
                  Mauqe ke mutabiq 3 tohfe (Included in message link):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {row.suggestions.map((sug, i) => (
                    <a
                      key={i}
                      href={sug.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg border border-[var(--color-border,#e5e7eb)] hover:border-[var(--color-gold,#B8935F)] bg-[#FAF8F5]/60 dark:bg-black/20 flex items-center justify-between text-xs group transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-medium text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] group-hover:text-[var(--color-gold,#B8935F)]">
                          {sug.title}
                        </span>
                        <p className="text-[10px] text-[var(--color-gold,#B8935F)] font-medium truncate">
                          {sug.description}
                        </p>
                      </div>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-[var(--color-gold,#B8935F)] shrink-0 ml-1 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
