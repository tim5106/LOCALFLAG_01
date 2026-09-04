export type FestivalStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';

function dateOnly(value: string): number { return Date.parse(`${value}T00:00:00+09:00`); }

export function festivalStatus(startDate: string, endDate: string, todayKst: string): FestivalStatus {
  const start = dateOnly(startDate); const end = dateOnly(endDate); const today = dateOnly(todayKst);
  if (![start, end, today].every(Number.isFinite) || end < start) throw new Error('INVALID_FESTIVAL_DATES');
  if (today > end) return 'EXPIRED';
  if (today >= start) return 'ACTIVE';
  return 'SCHEDULED'; // Ingestion starts at D-3; all fetched pre-start festivals are teasers.
}

export function kstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function addKstDays(date: Date, days: number): string {
  const current = kstDate(date);
  const shifted = new Date(`${current}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}
