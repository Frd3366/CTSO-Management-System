/**
 * Reliable local-time date utilities to prevent timezone date shifting (UTC midnight bug)
 * Especially critical in WITA (UTC+8), WIB (UTC+7), and WIT (UTC+9)
 */

export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
};

export const formatLocalDateIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getTodayIso = (): string => {
  return formatLocalDateIso(new Date());
};

export const getWeekAheadIso = (days = 7): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDateIso(d);
};

export const formatDateDMY = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DAY_NAMES_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const DAY_NAMES_SHORT_INDO = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const formatDateFullIndo = (isoDate: string): string => {
  if (!isoDate) return '';
  const d = parseLocalDate(isoDate);
  const dayName = DAY_NAMES_INDO[d.getDay()];
  const monthName = MONTH_NAMES_INDO[d.getMonth()];
  return `${dayName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`;
};

export const formatDateShortIndo = (isoDate: string): string => {
  if (!isoDate) return '';
  const d = parseLocalDate(isoDate);
  const dayName = DAY_NAMES_SHORT_INDO[d.getDay()];
  const monthName = MONTH_NAMES_INDO[d.getMonth()].slice(0, 3);
  return `${dayName}, ${d.getDate()} ${monthName} ${d.getFullYear()}`;
};

export const formatDateLongIndo = (isoDate: string): string => {
  if (!isoDate) return '';
  const d = parseLocalDate(isoDate);
  const monthName = MONTH_NAMES_INDO[d.getMonth()];
  return `${d.getDate()} ${monthName} ${d.getFullYear()}`;
};

export const formatMonthYearIndo = (date: Date): string => {
  return `${MONTH_NAMES_INDO[date.getMonth()]} ${date.getFullYear()}`;
};

