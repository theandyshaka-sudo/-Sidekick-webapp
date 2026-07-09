const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date): string {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const mm = minutes.toString().padStart(2, "0");
  return minutes === 0 ? `${hours} ${ampm}` : `${hours}:${mm} ${ampm}`;
}

// "Today · 3 PM", "Tomorrow · 10 AM", or "Mon, Jul 14 · 4 PM"
export function formatWhen(iso: string | null): string {
  if (!iso) return "Time not set";
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = formatTime(d);
  if (sameDay(d, now)) return `Today · ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} · ${time}`;
}

// "3p", "5:30p" — very compact time for tight calendar cells.
export function formatTimeCompact(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "p" : "a";
  const h = hours % 12 || 12;
  return minutes === 0 ? `${h}${ampm}` : `${h}:${minutes.toString().padStart(2, "0")}${ampm}`;
}

// "Jul 14" — compact date label with no time.
export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatMonthTitle(year: number, month: number): string {
  return `${MONTHS_LONG[month]} ${year}`;
}

export function monthLabel(month: number): string {
  return MONTHS_LONG[month];
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Build the 6-week grid (42 cells) for a month view, padded with nulls for leading/trailing days.
export function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return sameDay(a, b);
}

export function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
