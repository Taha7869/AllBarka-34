import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateDeliverySchedule } from '../lib/deliveryCalendar';

interface LahoreExpressTimerProps {
  className?: string;
  onOpenSchedule?: () => void;
}

/** Uses the order calendar, including Karachi time, the 18:00 cutoff and Sunday closure. */
export function deliveryBannerState(now: Date) {
  const schedule = calculateDeliverySchedule({ shippingMethodId: 'sameday', orderTimestamp: now });
  const cutoff = new Date(`${schedule.scheduledDeliveryDate}T18:00:00+05:00`);
  return { eligible: schedule.isSameDayEligible, dispatchDate: schedule.scheduledDeliveryDate, seconds: Math.max(0, Math.floor((cutoff.getTime() - now.getTime()) / 1000)) };
}

export default function LahoreExpressTimer({ className = '', onOpenSchedule }: LahoreExpressTimerProps) {
  const { t, language, isRtl } = useLanguage();
  const [state, setState] = useState(() => deliveryBannerState(new Date()));
  useEffect(() => {
    const update = () => setState(deliveryBannerState(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const date = new Intl.DateTimeFormat(language === 'en' ? 'en-PK' : language === 'ur' ? 'ur-PK' : 'ar-PK', { timeZone: 'Asia/Karachi', weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${state.dispatchDate}T12:00:00+05:00`));
  const compactDate = new Intl.DateTimeFormat(language === 'en' ? 'en-PK' : language === 'ur' ? 'ur-PK' : 'ar-PK', { timeZone: 'Asia/Karachi', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${state.dispatchDate}T12:00:00+05:00`));
  const hours = Math.floor(state.seconds / 3600);
  const minutes = String(Math.floor(state.seconds % 3600 / 60)).padStart(2, '0');
  const seconds = String(state.seconds % 60).padStart(2, '0');

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`w-full bg-[#042821] text-[#EDE8DE] border-b border-[#D4AF37]/30 py-2 px-3 sm:px-4 text-[11px] sm:text-xs ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex flex-wrap items-center gap-2 font-medium">
          <Clock size={13} aria-hidden="true" className="text-[#E4C783] shrink-0" />
          <span className="hidden sm:inline text-[#E4C783] font-semibold">{t('deliveryBanner.title')}</span>
          {state.eligible ? <span>{t('deliveryBanner.orderWithin')} <span dir="ltr" className="inline-block font-mono font-bold text-[#E4C783] bg-white/10 px-1.5 py-0.5 rounded">{hours}:{minutes}:{seconds}</span> {t('deliveryBanner.today')}</span> : <span>{t('deliveryBanner.nextDispatch')} <time dateTime={state.dispatchDate}><span className="hidden sm:inline">{date}</span><span className="sm:hidden">{compactDate}</span></time></span>}
          <span className="hidden sm:inline text-white/75">{t('deliveryBanner.policy')}</span>
        </div>
        {onOpenSchedule && <button type="button" onClick={onOpenSchedule} className="focus-ring min-h-11 max-w-[8rem] shrink-0 text-[#E4C783] hover:text-white underline underline-offset-2 font-medium cursor-pointer">{t('deliveryBanner.schedule')}</button>}
      </div>
    </div>
  );
}
