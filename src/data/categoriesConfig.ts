// Category → minimum-age rules for New York (HANDOFF.md §4). Kept as editable config, not
// hardcoded logic, so a corrected age tier is a data change, not a redeploy (HANDOFF §0.3).
// These tiers are ENGINEERING INPUT and must be validated by counsel against current NYLL §133
// hazardous lists + federal HO orders before launch — do not treat as legal advice.

export type AgeTier = "standard" | "moderate" | "hazardous";

export type ServiceCategory = {
  slug: string;
  name: string;
  minAge: number;
  tier: AgeTier;
  note?: string; // plain-language reason shown when a category is locked
};

export const serviceCategories: ServiceCategory[] = [
  // Standard — NY floor for non-hazardous work is 14.
  { slug: "interior_cleaning", name: "Interior / general cleaning", minAge: 14, tier: "standard" },
  { slug: "babysitting", name: "Babysitting", minAge: 14, tier: "standard" },
  { slug: "tutoring", name: "Tutoring", minAge: 14, tier: "standard" },
  { slug: "pet_care", name: "Pet care & dog walking", minAge: 14, tier: "standard" },
  { slug: "yard_work", name: "Yard work (no power tools)", minAge: 14, tier: "standard" },
  { slug: "trash_can_cleaning", name: "Garbage / trash-can cleaning", minAge: 14, tier: "standard" },
  { slug: "car_washing", name: "Car washing (ground level)", minAge: 14, tier: "standard" },
  { slug: "window_ground", name: "Window cleaning (ground level)", minAge: 14, tier: "standard" },
  { slug: "errands", name: "Deliveries & errands", minAge: 14, tier: "standard" },
  { slug: "tech_setup", name: "Basic tech setup", minAge: 14, tier: "standard" },

  // Physical / moderate — heavier lifting; broader access at 16.
  { slug: "moving_help", name: "Moving help", minAge: 16, tier: "moderate", note: "Heavy lifting — available at 16." },

  // Hazardous — NY bars under-18s from cleaning buildings from elevated surfaces and operating
  // power-driven machinery. Filled by the 18–20 adult pool.
  { slug: "pressure_washing", name: "Pressure washing", minAge: 18, tier: "hazardous", note: "Power equipment — available at 18 (NY safety rules)." },
  { slug: "gutter_cleaning", name: "Gutter cleaning", minAge: 18, tier: "hazardous", note: "Elevated work — available at 18 (NY safety rules)." },
  { slug: "window_elevated", name: "Above-ground window cleaning", minAge: 18, tier: "hazardous", note: "Elevated work — available at 18 (NY safety rules)." },
];

// The platform floor — under-14 employment is broadly prohibited in NY, 14 is the floor.
export const MIN_PLATFORM_AGE = 14;

// Compute age from a date of birth (ISO string). Age is always derived from the verified DOB at
// read time — never stored as a static number (HANDOFF §3), so it updates as the worker ages.
export function ageFromDob(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function isCategoryUnlocked(category: ServiceCategory, age: number): boolean {
  return age >= category.minAge;
}
