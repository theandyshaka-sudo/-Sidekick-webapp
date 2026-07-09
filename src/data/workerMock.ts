// Placeholder content for UI development only — replace with real data once M1/M2 (auth,
// listings, bookings) land. Photos are stock placeholders (Lorem Picsum, seeded for
// consistency) standing in for real/licensed photography or user-uploaded photos.

// The signed-in business owner — blank until they fill in their profile.
export const workerProfile = {
  displayName: "",
  businessName: "",
  avatarUri: "",
  memberSince: "Jul 2026",
};

// Workers price each service either per hour ("$25/hr") or per job ("From $15"). Amount is
// worker-set — the platform never sets or caps it (HANDOFF.md §0.1).
export type PriceType = "hour" | "job";

export function formatServicePrice(priceType: PriceType, amount: number): string {
  return priceType === "hour" ? `$${amount}/hr` : `From $${amount}`;
}

// Format an hour on a 24h clock (0–23) as "9 AM" / "12 PM" / "4 PM".
export function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

// Days of the week a service is offered, using JS getDay() convention (0 = Sun … 6 = Sat).
export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// Summarize selected days: "Every day" / "Weekdays" / "Weekends" / "Mon, Wed, Fri" / "No days".
export function formatDays(days: number[]): string {
  const set = [...days].sort((a, b) => a - b);
  if (set.length === 0) return "No days set";
  if (set.length === 7) return "Every day";
  if (set.length === 5 && [1, 2, 3, 4, 5].every((d) => set.includes(d))) return "Weekdays";
  if (set.length === 2 && set[0] === 0 && set[1] === 6) return "Weekends";
  return set.map((d) => DAY_NAMES[d]).join(", ");
}

// Each service carries the hours the worker is willing to do it (availFrom–availTo, 24h clock) and
// the days of the week they offer it (e.g. only Tue/Wed). Shown on the listing so clients propose
// times that fit. Fresh account — no services listed yet.
export const workerServices: Array<{
  id: string;
  title: string;
  priceType: PriceType;
  priceAmount: number;
  availFrom: number;
  availTo: number;
  days: number[];
  photoUri: string;
}> = [];
