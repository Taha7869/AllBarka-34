import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateDeliverySchedule } from '../lib/deliveryCalendar';

interface LahoreExpressTimerProps {
  className?: string;
  onOpenSchedule?: () => void;
}

export default function LahoreExpressTimer({ className = '', onOpenSchedule }: LahoreExpressTimerProps) {
  const { t, language, isRtl } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const schedule = calculateDeliverySchedule({ city: 'Lahore', shippingMethodId: 'sameday', orderTimestamp: now });
  const dispatchDate = new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : language === 'ar' ? 'ar' : 'en-PK', {
    timeZone: 'Asia/Karachi', weekday: 'short', month: 'short', day: 'numeric',
  }).format(new Date(`${schedule.scheduledDeliveryDate}T12:00:00+05:00`));

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className={`w-full border-b border-[#D4AF37]/30 bg-[#042821] px-3 text-[#EDE8DE] sm:px-4 ${className}`}>
      <div className="mx-auto flex min-h-11 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1 text-[11px] sm:text-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Truck size={14} aria-hidden="true" className="shrink-0 text-[#E4C783]" />
          <span className="font-medium">{t('experience.dispatch.lahore')}</span>
          <span className="text-[#E4C783]">
            {schedule.isSameDayEligible ? t('experience.dispatch.cutoff') : <>{t('experience.dispatch.next')} <bdi>{dispatchDate}</bdi></>}
          </span>
        </div>
        {onOpenSchedule && <button type="button" onClick={onOpenSchedule} className="focus-ring inline-flex min-h-11 items-center text-[#E4C783] underline underline-offset-2 hover:text-white">
          {t('experience.dispatch.schedule')}
        </button>}
      </div>
    </div>
  );
}
