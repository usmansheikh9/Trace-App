/** Formats digits as 00000-0000000-0 while typing. */
export function formatCnic(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** 15000 -> "15,000". Regex rather than Intl so output is identical on every engine. */
export function formatCount(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

/** Formats digits as DD/MM/YYYY while typing (slashes are inserted, never typed). */
export function formatDmyInput(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export type DobCheck =
  | { ok: true; iso: string }
  | { ok: false; error: string };

/**
 * Validates a typed DD/MM/YYYY date of birth: complete, a real calendar date
 * (no 31/02), from 1900 on, and not in the future. Returns the API's YYYY-MM-DD.
 * Compared by calendar parts, so no timezone can shift the day.
 */
export function checkDob(input: string, today: Date = new Date()): DobCheck {
  if (!input) return { ok: false, error: 'Required' };
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  if (!m) return { ok: false, error: 'Enter a date as DD/MM/YYYY' };

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const probe = new Date(year, month - 1, day);
  const real =
    year >= 1900 &&
    probe.getFullYear() === year &&
    probe.getMonth() === month - 1 &&
    probe.getDate() === day;
  if (!real) return { ok: false, error: 'Enter a valid date' };

  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  if (year * 10000 + month * 100 + day > todayKey) {
    return { ok: false, error: "Date of birth can't be in the future" };
  }
  return { ok: true, iso: `${m[3]}-${m[2]}-${m[1]}` };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1996-03-14" -> "14 Mar 1996". Parsed by hand so no timezone can shift the day. */
export function formatDate(iso: string | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return iso || '—';
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso!;
}

/**
 * ISO timestamp -> local "13 Nov, 3:05 PM" (year added when it isn't this year).
 * Built by hand rather than Intl so output is identical on every engine.
 */
export function formatDateTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours() % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${time}`;
}
