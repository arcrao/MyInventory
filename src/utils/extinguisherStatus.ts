import { DUE_SOON_DAYS } from '../constants';
import { ExtinguisherStatus } from '../types';

/**
 * Date helpers shared by the status badge, the server-side status filter and
 * the summary card counts.
 *
 * All three derive from the SAME bounds, computed once on the client and passed
 * down to the queries. Letting the client and the database each decide what
 * "today" means drifts by a day across timezones and around midnight, which
 * would show a red "Overdue" badge on a row the server counted as "Due Soon".
 */

/**
 * Today as yyyy-mm-dd in the user's LOCAL timezone.
 *
 * Deliberately not `toISOString().split('T')[0]`, which returns the UTC date -
 * that is a day behind for any user east of UTC during their morning.
 */
export const getLocalDateISO = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDaysISO = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getLocalDateISO(date);
};

/** The { today, dueSoonDate } pair every extinguisher query is bounded by. */
export const getDueBounds = (): { today: string; dueSoonDate: string } => {
  const today = getLocalDateISO();
  return { today, dueSoonDate: addDaysISO(today, DUE_SOON_DAYS) };
};

/**
 * Status of a single record. Mirrors the predicates used by
 * StorageService.applyFireExtinguisherFilters and by the summary RPC.
 */
export const getExtinguisherStatus = (
  refillingDueDate: string | null,
  today: string,
  dueSoonDate: string
): Exclude<ExtinguisherStatus, 'all'> => {
  if (!refillingDueDate) return 'no_date';
  if (refillingDueDate < today) return 'overdue';
  if (refillingDueDate <= dueSoonDate) return 'due_soon';
  return 'ok';
};

export const STATUS_LABELS: Record<Exclude<ExtinguisherStatus, 'all'>, string> = {
  overdue: 'Overdue',
  due_soon: 'Due Soon',
  ok: 'OK',
  no_date: 'No Due Date',
};

export const STATUS_BADGE_CLASSES: Record<Exclude<ExtinguisherStatus, 'all'>, string> = {
  overdue: 'bg-red-100 text-red-800 border border-red-200',
  due_soon: 'bg-amber-100 text-amber-800 border border-amber-200',
  ok: 'bg-green-100 text-green-800 border border-green-200',
  no_date: 'bg-gray-100 text-gray-600 border border-gray-200',
};

/** Render a stored yyyy-mm-dd as a local date, without timezone shifting it. */
export const formatExtinguisherDate = (isoDate: string | null): string => {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString();
};
