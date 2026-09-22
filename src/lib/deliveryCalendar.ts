/**
 * Delivery Calendar & Schedule Calculation Service for AllBarka Luxury Boutique
 *
 * Authoritative Rules:
 * - Timezone: Asia/Karachi for all cutoff and date calculations.
 * - Coverage: Same-day delivery is available in Lahore only.
 * - Operating Days: Monday through Saturday (Sunday is closed for dispatch).
 * - Cutoff: 6:00 PM (18:00) Asia/Karachi time on operating days.
 * - Same-Day Fee:
 *     - Rs. 500 when authoritative order total (before shipping) <= Rs. 3,000.
 *     - Rs. 300 when authoritative order total (before shipping) > Rs. 3,000.
 * - Standard Shipping: Rs. 150 (Free if order subtotal >= Rs. 3,000).
 * - Express Shipping: Rs. 350 (Priority Dispatch).
 * - Sunday / Post-Cutoff Rollover:
 *     - Orders after 6:00 PM on Saturday or anytime Sunday are scheduled for Monday.
 *     - Orders after 6:00 PM Monday-Friday are scheduled for the next operating day.
 */

export interface KarachiTimeParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  dayOfWeekName: string; // e.g. "Sunday", "Monday", etc.
  hour: number; // 0-23
  minute: number; // 0-59
  isoDateStr: string; // YYYY-MM-DD
}

export interface DeliveryScheduleResult {
  shippingMethodId: 'standard' | 'express' | 'sameday';
  city: string;
  isLahore: boolean;
  orderTimestampIso: string;
  karachiTime: KarachiTimeParts;
  dayOfWeekName: string;
  isOperatingDay: boolean;
  isBeforeCutoff: boolean; // <= 18:00 Karachi time on Mon-Sat
  isSameDayEligible: boolean; // isLahore && isBeforeCutoff
  scheduledDeliveryDate: string; // YYYY-MM-DD
  scheduledDeliveryFormatted: string; // e.g. "Monday, Sep 28, 2026"
  isSundayRollover: boolean;
  rolloverReason: 'SUNDAY_CLOSED' | 'AFTER_CUTOFF' | null;
  sameDayStatus: 'ELIGIBLE_SAME_DAY' | 'SCHEDULED_NEXT_OPERATING_DAY' | 'NOT_APPLICABLE';
  shippingFee: number;
  deliveryNote: string;
}

/**
 * Returns date and time breakdown in Asia/Karachi timezone.
 */
export function getKarachiTime(dateInput?: Date | number | string): KarachiTimeParts {
  const date = dateInput ? new Date(dateInput) : new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = p.value;
    }
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // Normalize 24:00 to 00:00
  const minute = parseInt(map.minute, 10);
  const dayOfWeek = weekdayMap[map.weekday] ?? 0;
  const dayOfWeekName = dayNames[dayOfWeek];

  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  const isoDateStr = `${year}-${monthStr}-${dayStr}`;

  return { year, month, day, dayOfWeek, dayOfWeekName, hour, minute, isoDateStr };
}

/**
 * Formats a YYYY-MM-DD date into a human-readable string in UTC (e.g. "Monday, Sep 28, 2026").
 */
export function formatKarachiDeliveryDate(year: number, month: number, day: number): string {
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return dateObj.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getNextOperatingDay(kt: KarachiTimeParts): { year: number; month: number; day: number } {
  const currentUtc = new Date(Date.UTC(kt.year, kt.month - 1, kt.day));
  let candidate = new Date(currentUtc.getTime() + 24 * 60 * 60 * 1000);
  while (candidate.getUTCDay() === 0) { // 0 = Sunday
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    year: candidate.getUTCFullYear(),
    month: candidate.getUTCMonth() + 1,
    day: candidate.getUTCDate(),
  };
}

/**
 * Calculates authoritative delivery schedule, cutoff, and fee in Asia/Karachi time.
 */
export function calculateDeliverySchedule({
  shippingMethodId = 'standard',
  city = 'Lahore',
  orderSubtotalNet = 0,
  orderTimestamp = new Date(),
}: {
  shippingMethodId?: 'standard' | 'express' | 'sameday';
  city?: string;
  orderSubtotalNet?: number;
  orderTimestamp?: Date | number | string;
}): DeliveryScheduleResult {
  const kt = getKarachiTime(orderTimestamp);
  const isLahore = city.trim().toLowerCase() === 'lahore';
  const isOperatingDay = kt.dayOfWeek >= 1 && kt.dayOfWeek <= 6; // Mon-Sat
  // Cutoff is 6:00 PM (18:00). 18:00 is eligible; 18:01 is past cutoff.
  const isBeforeCutoff = isOperatingDay && (kt.hour < 18 || (kt.hour === 18 && kt.minute === 0));

  let isSameDayEligible = false;
  let scheduledYear = kt.year;
  let scheduledMonth = kt.month;
  let scheduledDay = kt.day;
  let isSundayRollover = false;
  let rolloverReason: 'SUNDAY_CLOSED' | 'AFTER_CUTOFF' | null = null;
  let sameDayStatus: DeliveryScheduleResult['sameDayStatus'] = 'NOT_APPLICABLE';

  if (kt.dayOfWeek === 0 || (kt.dayOfWeek === 6 && !isBeforeCutoff)) {
    rolloverReason = 'SUNDAY_CLOSED';
  } else if (!isBeforeCutoff) {
    rolloverReason = 'AFTER_CUTOFF';
  }

  if (shippingMethodId === 'sameday') {
    isSameDayEligible = isLahore && isBeforeCutoff;

    if (isSameDayEligible) {
      sameDayStatus = 'ELIGIBLE_SAME_DAY';
    } else {
      sameDayStatus = 'SCHEDULED_NEXT_OPERATING_DAY';
      const nextDate = getNextOperatingDay(kt);
      scheduledYear = nextDate.year;
      scheduledMonth = nextDate.month;
      scheduledDay = nextDate.day;
      if (kt.dayOfWeek === 0 || (kt.dayOfWeek === 6 && !isBeforeCutoff)) {
        isSundayRollover = true;
      }
    }
  } else {
    if (!isBeforeCutoff || !isOperatingDay) {
      const nextDate = getNextOperatingDay(kt);
      scheduledYear = nextDate.year;
      scheduledMonth = nextDate.month;
      scheduledDay = nextDate.day;
      if (kt.dayOfWeek === 0 || (kt.dayOfWeek === 6 && !isBeforeCutoff)) {
        isSundayRollover = true;
      }
    }
  }

  // Calculate Shipping Fee
  let shippingFee = 0;
  if (shippingMethodId === 'sameday') {
    // Same-day fee: Rs. 500 if orderSubtotalNet <= 3000, Rs. 300 if orderSubtotalNet > 3000
    shippingFee = orderSubtotalNet <= 3000 ? 500 : 300;
  } else if (shippingMethodId === 'express') {
    shippingFee = 350;
  } else {
    // Standard shipping: Rs. 150 (Free if orderSubtotalNet >= 3000)
    shippingFee = orderSubtotalNet >= 3000 ? 0 : 150;
  }

  const monthStr = scheduledMonth.toString().padStart(2, '0');
  const dayStr = scheduledDay.toString().padStart(2, '0');
  const scheduledDeliveryDate = `${scheduledYear}-${monthStr}-${dayStr}`;
  const scheduledDeliveryFormatted = formatKarachiDeliveryDate(scheduledYear, scheduledMonth, scheduledDay);

  let deliveryNote = '';
  if (shippingMethodId === 'sameday') {
    if (isSameDayEligible) {
      deliveryNote = `Same-Day Delivery in Lahore requested for ${scheduledDeliveryFormatted} (Fee: Rs. ${shippingFee}).`;
    } else if (!isLahore) {
      deliveryNote = `Same-Day delivery is available in Lahore only. Scheduled for standard dispatch to ${city} on ${scheduledDeliveryFormatted}.`;
    } else {
      deliveryNote = `Orders placed after 6:00 PM or on Sunday are scheduled for dispatch on ${scheduledDeliveryFormatted}.`;
    }
  } else {
    deliveryNote = `Scheduled delivery date: ${scheduledDeliveryFormatted}.`;
  }

  const orderTimestampIso = (orderTimestamp instanceof Date)
    ? orderTimestamp.toISOString()
    : new Date(orderTimestamp || Date.now()).toISOString();

  return {
    shippingMethodId,
    city,
    isLahore,
    orderTimestampIso,
    karachiTime: kt,
    dayOfWeekName: kt.dayOfWeekName,
    isOperatingDay,
    isBeforeCutoff,
    isSameDayEligible,
    scheduledDeliveryDate,
    scheduledDeliveryFormatted,
    isSundayRollover,
    rolloverReason,
    sameDayStatus,
    shippingFee,
    deliveryNote,
  };
}
