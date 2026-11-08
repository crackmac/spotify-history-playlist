export function getTodayBoundaries(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export function getDateBoundaries(targetDate: Date): { start: Date; end: Date } {
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export function getDateBoundariesUTC(targetDate: Date): { startUTC: Date; endUTC: Date } {
  const localStart = new Date(targetDate);
  localStart.setHours(0, 0, 0, 0);
  
  const localEnd = new Date(targetDate);
  localEnd.setHours(23, 59, 59, 999);
  
  const timezoneOffsetMs = localStart.getTimezoneOffset() * 60 * 1000;
  const startUTC = new Date(localStart.getTime() + timezoneOffsetMs);
  const endUTC = new Date(localEnd.getTime() + timezoneOffsetMs);
  
  return { startUTC, endUTC };
}

export function isToday(date: Date): boolean {
  const { start, end } = getTodayBoundaries();
  return date >= start && date <= end;
}

export function isDate(date: Date, targetDate: Date): boolean {
  const { start, end } = getDateBoundaries(targetDate);
  return date >= start && date <= end;
}

export function isDateUTC(dateUTC: Date, targetDate: Date): boolean {
  const { startUTC, endUTC } = getDateBoundariesUTC(targetDate);
  return dateUTC >= startUTC && dateUTC <= endUTC;
}

export function parseDate(dateString: string): Date {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateString);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD format.`);
  }
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  
  // new Date() rolls out-of-range parts over (2026-02-30 -> March 2), so
  // check that the date we built is the one that was asked for.
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    throw new Error(`Invalid date: ${dateString}.`);
  }
  
  return date;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
