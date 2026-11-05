import type { ActivityEvent } from '../../store/activityFeed';
import type { RecurringTemplate } from '../../store/recurringSchedule';
import { formatPkr } from '../../utils/currency';

/** YYYY-MM-DD in the device's local time zone. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Monday-first weekday index (0 = Monday). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export interface CalendarCell {
  key: string;
  date: Date | null;
  dayNumber: number | null;
}

/** Six rows of seven cells; leading and trailing cells outside the month are null. */
export function buildMonthGrid(month: Date): CalendarCell[] {
  const first = startOfMonth(month);
  const offset = mondayIndex(first);
  const total = daysInMonth(first);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < offset; i += 1) cells.push({ key: `lead-${i}`, date: null, dayNumber: null });
  for (let d = 1; d <= total; d += 1) {
    const date = new Date(first.getFullYear(), first.getMonth(), d);
    cells.push({ key: dayKey(date), date, dayNumber: d });
  }
  while (cells.length % 7 !== 0)
    cells.push({ key: `trail-${cells.length}`, date: null, dayNumber: null });
  return cells;
}

export type CalendarEntryKind = 'expense' | 'checkout' | 'settle' | 'due';

export interface CalendarEntry {
  id: string;
  kind: CalendarEntryKind;
  /** Exactly the line the brief asks for, e.g. "Internet bill · PKR 1,500.00 · Bilal paid". */
  line: string;
  /** Local time (HH:mm) for posted payments; null for dues. */
  time: string | null;
  amount: number | null;
  sortKey: number;
}

/** First segment of a feed title: "Internet bill · Utilities · monthly" → "Internet bill". */
export function baseTitle(title: string): string {
  return title.split(' · ')[0]?.trim() || title.trim();
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function entryFromEvent(event: ActivityEvent): CalendarEntry | null {
  const when = new Date(event.createdAt).getTime();
  const amount = event.amount ?? null;
  const money = amount !== null ? formatPkr(amount) : null;
  switch (event.type) {
    case 'expense':
    case 'checkout': {
      const who = event.memberName ? ` · ${event.memberName} paid` : '';
      return {
        id: event.id,
        kind: event.type,
        line: `${baseTitle(event.title)}${money ? ` · ${money}` : ''}${who}`,
        time: timeLabel(event.createdAt),
        amount,
        sortKey: when,
      };
    }
    case 'settle':
      return {
        id: event.id,
        kind: 'settle',
        line: `${baseTitle(event.title)}${money ? ` · ${money}` : ''}`,
        time: timeLabel(event.createdAt),
        amount,
        sortKey: when,
      };
    default:
      // Adding an item to the list is not a payment; the calendar is about money.
      return null;
  }
}

export interface CalendarMonthData {
  /** dayKey → entries for that day, sorted by time, dues last. */
  byDay: Map<string, CalendarEntry[]>;
  /** dayKey set with at least one posted payment. */
  paymentDays: Set<string>;
  /** dayKey set with at least one due item. */
  dueDays: Set<string>;
  /** Totals for the visible month from this phone's events. */
  spent: number;
  settled: number;
  count: number;
}

/**
 * Joins the on-device activity feed with recurring templates for one month.
 * A due item is hidden for a month in which an expense with the same title was already posted,
 * so the day a bill is logged never reads as both "paid" and "due".
 */
export function buildMonthData(
  month: Date,
  events: ActivityEvent[],
  templates: RecurringTemplate[],
): CalendarMonthData {
  const byDay = new Map<string, CalendarEntry[]>();
  const paymentDays = new Set<string>();
  const dueDays = new Set<string>();
  const postedTitles = new Set<string>();
  const mk = monthKey(month);
  let spent = 0;
  let settled = 0;
  let count = 0;

  for (const event of events) {
    const date = new Date(event.createdAt);
    if (Number.isNaN(date.getTime()) || monthKey(date) !== mk) continue;
    const entry = entryFromEvent(event);
    if (!entry) continue;
    const key = dayKey(date);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
    paymentDays.add(key);
    count += 1;
    if (entry.kind === 'settle') settled += entry.amount ?? 0;
    else spent += entry.amount ?? 0;
    if (entry.kind === 'expense') postedTitles.add(baseTitle(event.title).toLowerCase());
  }

  const monthStart = startOfMonth(month).getTime();
  for (const template of templates) {
    const created = new Date(template.createdAt);
    const createdMonthStart = Number.isNaN(created.getTime()) ? 0 : startOfMonth(created).getTime();
    if (monthStart < createdMonthStart) continue;
    if (postedTitles.has(template.title.toLowerCase())) continue;
    const day = Math.min(template.dayOfMonth, daysInMonth(month));
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = dayKey(date);
    const list = byDay.get(key) ?? [];
    list.push({
      id: `${template.id}-${mk}`,
      kind: 'due',
      line: `${template.title} due · ${formatPkr(template.amount)} · ${template.payerName}`,
      time: null,
      amount: template.amount,
      sortKey: Number.MAX_SAFE_INTEGER,
    });
    byDay.set(key, list);
    dueDays.add(key);
  }

  for (const list of byDay.values()) list.sort((a, b) => a.sortKey - b.sortKey);

  return { byDay, paymentDays, dueDays, spent: round2(spent), settled: round2(settled), count };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function selectedDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  const today = dayKey(new Date());
  if (key === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' });
}
