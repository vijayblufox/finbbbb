/**
 * NSE Market Trading Calendar Utility
 * Accurately determines Indian Stock Market (NSE) trading sessions,
 * handling weekends (Saturday/Sunday) and post-market hours.
 */

export interface NseSessionDetails {
  isMarketOpenNow: boolean;
  isWeekend: boolean;
  dayName: string;
  signalDate: string; // The date of the closing candle the signal was computed from
  entryTradingDate: string; // The real trading date when the order can be executed (Mon-Fri)
  entryTimeDescription: string;
  badgeLabel: string;
  badgeColor: 'emerald' | 'amber' | 'indigo';
}

export function getNseSessionDetails(refDate: Date = new Date()): NseSessionDetails {
  // Convert to Indian Standard Time (IST = UTC + 5:30)
  const utc = refDate.getTime() + (refDate.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5));

  const dayOfWeek = istTime.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const marketOpenMinutes = 9 * 60 + 15; // 09:15 IST
  const marketCloseMinutes = 15 * 60 + 30; // 15:30 IST

  const toYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek];

  const signalDateObj = new Date(istTime);
  const entryDateObj = new Date(istTime);

  let isWeekend = false;
  let isMarketOpenNow = false;
  let entryTimeDescription = '';
  let badgeLabel = '';
  let badgeColor: 'emerald' | 'amber' | 'indigo' = 'emerald';

  if (dayOfWeek === 6) {
    // Saturday: Signal derived from Friday (-1), Entry is Monday (+2)
    isWeekend = true;
    signalDateObj.setDate(istTime.getDate() - 1);
    entryDateObj.setDate(istTime.getDate() + 2);
    entryTimeDescription = `Next Session: Monday (${toYMD(entryDateObj)}) at 09:15 AM IST`;
    badgeLabel = 'Weekend Prep (Mon Open)';
    badgeColor = 'amber';
  } else if (dayOfWeek === 0) {
    // Sunday: Signal derived from Friday (-2), Entry is Monday (+1)
    isWeekend = true;
    signalDateObj.setDate(istTime.getDate() - 2);
    entryDateObj.setDate(istTime.getDate() + 1);
    entryTimeDescription = `Next Session: Monday (${toYMD(entryDateObj)}) at 09:15 AM IST`;
    badgeLabel = 'Weekend Prep (Mon Open)';
    badgeColor = 'amber';
  } else {
    // Weekdays (Monday - Friday)
    if (currentMinutes >= marketOpenMinutes && currentMinutes <= marketCloseMinutes) {
      // Live Trading Session
      isMarketOpenNow = true;
      entryTimeDescription = 'Live Market Session (09:15 - 15:30 IST)';
      badgeLabel = 'Live Session';
      badgeColor = 'emerald';
    } else if (currentMinutes > marketCloseMinutes) {
      // After Market Close: Signal is from today, entry is next trading day
      if (dayOfWeek === 5) {
        // Friday after 15:30 -> Next is Monday (+3)
        entryDateObj.setDate(istTime.getDate() + 3);
        entryTimeDescription = `Next Session: Monday (${toYMD(entryDateObj)}) at 09:15 AM IST`;
        badgeLabel = 'Post-Close (Mon Open)';
        badgeColor = 'indigo';
      } else {
        entryDateObj.setDate(istTime.getDate() + 1);
        entryTimeDescription = `Next Session: Tomorrow (${toYMD(entryDateObj)}) at 09:15 AM IST`;
        badgeLabel = 'Post-Market (Next Open)';
        badgeColor = 'indigo';
      }
    } else {
      // Pre-Market (before 09:15 IST): Entry is Today at 09:15 AM
      if (dayOfWeek === 1) {
        // Monday morning before 09:15 -> Signal from Friday (-3)
        signalDateObj.setDate(istTime.getDate() - 3);
      } else {
        signalDateObj.setDate(istTime.getDate() - 1);
      }
      entryTimeDescription = `Today (${toYMD(entryDateObj)}) at 09:15 AM IST`;
      badgeLabel = 'Pre-Market (Today Open)';
      badgeColor = 'amber';
    }
  }

  return {
    isMarketOpenNow,
    isWeekend,
    dayName,
    signalDate: toYMD(signalDateObj),
    entryTradingDate: toYMD(entryDateObj),
    entryTimeDescription,
    badgeLabel,
    badgeColor,
  };
}
