import React, { useState, useEffect, useCallback } from 'react';
import { CalendarHeart, Plus, Trash2, Gift, Clock, AlertCircle, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  calculateDaysRemaining,
  type OccasionReminder,
  type OccasionType,
  type RelationshipType,
} from '../lib/occasionReminders';

export default function OccasionRemindersSection() {
  const { currentUser } = useAuth();
  const { t, isRtl } = useLanguage();

  const [reminders, setReminders] = useState<OccasionReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('parents');
  const [occasionType, setOccasionType] = useState<OccasionType>('birthday');
  const [customOccasion, setCustomOccasion] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/me/occasions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load reminders');
      const data = await res.json();
      if (data.success && Array.isArray(data.occasions)) {
        setReminders(data.occasions);
      }
    } catch {
      setError(t('reminders.loadError', 'Could not load your saved dates. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!recipientName.trim()) {
      setFormError(t('reminders.nameRequired', 'Please enter a recipient name.'));
      return;
    }
    if (!date) {
      setFormError(t('reminders.dateRequired', 'Please pick an occasion date.'));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        recipientName: recipientName.trim(),
        relationship,
        occasionType,
        customOccasion: occasionType === 'other' ? customOccasion.trim() : undefined,
        date,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/me/occasions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save reminder');
      const data = await res.json();
      if (data.success && data.occasion) {
        setReminders((prev) => [data.occasion, ...prev]);
        setShowAddForm(false);
        setRecipientName('');
        setCustomOccasion('');
        setDate('');
        setNotes('');
      }
    } catch {
      setFormError(t('reminders.saveError', 'Could not save reminder. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      // Optimistic delete
      setReminders((prev) => prev.filter((r) => r.id !== id));
      const token = await currentUser.getIdToken();
      await fetch(`/api/me/occasions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Refresh in case of failure
      fetchReminders();
    }
  };

  const relationshipLabels: Record<RelationshipType, string> = {
    parents: t('relationship.parents', 'Parents / والِدَین'),
    spouse: t('relationship.spouse', 'Spouse / شَوہَر / بِیوی'),
    sibling: t('relationship.sibling', 'Sibling / بہن / بھائی'),
    child: t('relationship.child', 'Child / بَچّہ / اَولاد'),
    friend: t('relationship.friend', 'Friend / دَوست'),
    relative: t('relationship.relative', 'Relative / رِشتہ دار'),
    colleague: t('relationship.colleague', 'Colleague / ساتھی'),
    other: t('relationship.other', 'Other / دُوسرا'),
  };

  const occasionLabels: Record<OccasionType, string> = {
    birthday: t('occasion.birthday', 'Birthday / سالگِرہ'),
    wedding_anniversary: t('occasion.anniversary', 'Wedding Anniversary / شادی کی سالگِرہ'),
    eid: t('occasion.eid', 'Eid / عِید'),
    other: t('occasion.other', 'Other / دُوسرا موقع'),
  };

  return (
    <div className="bg-white dark:bg-[#1A201E] border border-[var(--color-gold,#B8935F)]/30 rounded-2xl p-5 shadow-sm space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-gold,#B8935F)]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-gold,#B8935F)]/15 flex items-center justify-center text-[var(--color-gold,#B8935F)]">
            <CalendarHeart size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
              {t('reminders.title', 'Meri Tareekhain (Occasion Reminders)')}
            </h4>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {t('reminders.subtitle', 'Save birthdays & anniversaries for personalized concierge gift ideas.')}
            </p>
          </div>
        </div>

        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#042821] hover:bg-[#073d32] dark:bg-[var(--color-gold,#B8935F)] dark:hover:bg-[#c9a36f] text-white dark:text-[#042821] text-xs font-bold transition-colors min-h-9"
          >
            <Plus size={14} />
            <span>{t('reminders.addBtn', 'Add Date')}</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[var(--color-cream,#FAF9F5)] dark:bg-[#222A28] border border-[var(--color-gold,#B8935F)]/30 space-y-3.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-[#042821] dark:text-[#FAF9F5]">
              {t('reminders.addNew', 'Add New Occasion')}
            </h5>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-full focus-ring"
            >
              <X size={15} />
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Recipient Name */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('reminders.nameLabel', 'Whose celebration is this? (Naam)')} *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="E.g. Ammi, Hamza, Ayesha..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('reminders.relLabel', 'Relationship (Rishta)')}
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as RelationshipType)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
              >
                {(Object.keys(relationshipLabels) as RelationshipType[]).map((key) => (
                  <option key={key} value={key}>
                    {relationshipLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Occasion Type */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('reminders.occLabel', 'Occasion (Mauqa)')}
              </label>
              <select
                value={occasionType}
                onChange={(e) => setOccasionType(e.target.value as OccasionType)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
              >
                {(Object.keys(occasionLabels) as OccasionType[]).map((key) => (
                  <option key={key} value={key}>
                    {occasionLabels[key]}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('reminders.dateLabel', 'Celebration Date (Tareekh)')} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
              />
            </div>
          </div>

          {occasionType === 'other' && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                {t('reminders.customOccLabel', 'Describe Occasion')}
              </label>
              <input
                type="text"
                value={customOccasion}
                onChange={(e) => setCustomOccasion(e.target.value)}
                placeholder="E.g. Housewarming, Graduation, Promotion..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              {t('reminders.notesLabel', 'Gift Preferences or Personal Notes (Optional)')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Likes roasted pistachios and dry fruits..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-gold,#B8935F)]/30 bg-white dark:bg-[#1A201E] text-neutral-900 dark:text-neutral-100 focus-ring min-h-10 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 min-h-9"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="focus-ring inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#042821] hover:bg-[#073d32] dark:bg-[var(--color-gold,#B8935F)] dark:hover:bg-[#c9a36f] text-white dark:text-[#042821] text-xs font-bold transition-colors min-h-9 disabled:opacity-50"
            >
              <Check size={14} />
              <span>{saving ? t('saving', 'Saving...') : t('reminders.saveBtn', 'Save Reminder')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reminder List */}
      {loading ? (
        <div className="py-8 text-center text-[var(--color-gold,#B8935F)]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mx-auto mb-2"></div>
          <p className="text-xs">{t('reminders.loading', 'Loading your occasions...')}</p>
        </div>
      ) : error ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
          {error}
        </p>
      ) : reminders.length === 0 && !showAddForm ? (
        <div className="p-6 text-center rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
          <CalendarHeart size={28} className="mx-auto text-neutral-400" />
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t('reminders.emptyState', 'No dates added yet. Add birthdays or anniversaries to never miss a celebration.')}
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[#C7982F] hover:underline pt-1"
          >
            <Plus size={13} />
            <span>{t('reminders.addFirst', 'Add your first occasion')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reminders.map((reminder) => {
            const { daysRemaining, targetDateFormatted, isThisWeek } = calculateDaysRemaining(reminder.date);

            return (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-gold,#B8935F)]/25 bg-[var(--color-cream,#FAF9F5)]/60 dark:bg-[#222A28]/60 hover:border-[var(--color-gold,#B8935F)]/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#042821] dark:text-[#FAF9F5]">
                      {reminder.recipientName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                      {relationshipLabels[reminder.relationship] || reminder.relationship}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-gold,#B8935F)]/15 text-[var(--color-gold,#B8935F)] font-semibold">
                      {occasionLabels[reminder.occasionType] || reminder.occasionType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-[#C7982F]" />
                      <span>{targetDateFormatted}</span>
                    </span>

                    {daysRemaining === 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        🎉 {t('reminders.today', 'Today!')}
                      </span>
                    ) : daysRemaining <= 7 ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        ⚡ {daysRemaining} {t('reminders.daysLeft', 'days left (This week)')}
                      </span>
                    ) : (
                      <span className="text-neutral-500">
                        {daysRemaining} {t('reminders.daysRemaining', 'days away')}
                      </span>
                    )}

                    {reminder.notes && (
                      <span className="italic truncate max-w-[200px]" title={reminder.notes}>
                        “{reminder.notes}”
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(reminder.id)}
                  aria-label={t('reminders.delete', 'Delete reminder')}
                  className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg focus-ring shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
