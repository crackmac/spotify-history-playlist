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

// A Date is an absolute instant, so local midnight already *is* the right
// UTC boundary (e.g. 00:00 PST == 08:00Z); toISOString() shows it in UTC.
// Do not add getTimezoneOffset() on top: that shifts the window by the
// offset a second time (to 08:00-08:00 local in PST), dropping plays from
// just after midnight and pulling in the next morning's plays.
export function getDateBoundariesUTC(targetDate: Date): { startUTC: Date; endUTC: Date } {
  const { start, end } = getDateBoundaries(targetDate);
  return { startUTC: start, endUTC: end };
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
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD format.`);
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD format.`);
  }
  
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) {
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
