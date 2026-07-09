// Catalog of advertisable services with a minimum age for each. Workers pick from the subset
// their verified age allows (HANDOFF §4). Like categoriesConfig, this is ENGINEERING INPUT — the
// age tiers must be validated by counsel against NY child-labor rules before launch.
// Reasoning used for the tiers (verify with counsel):
//   14+  standard, non-hazardous work (NY floor).
//   16+  heavier / physical work.
//   18+  power-driven equipment, elevated/roof work, chemicals, or driving — NY bars under-18s.
// The worker is advertising an independent service, not taking employment; these tiers are a
// safety guardrail, not an employer's hours/duties rule.
// Deliberately curated to services people actually book and pay for — sub-tasks and filler are out.

export type CatalogService = {
  name: string;
  category: string;
  minAge: number;
  note?: string; // shown when the service is locked for the worker's age
};

const HAZARD = "Power equipment / elevated / chemicals — 18+ (NY safety rules).";
const HEAVY = "Heavier physical work — 16+.";
const DRIVING = "Requires driving — 18+.";

export const serviceCatalog: CatalogService[] = [
  // ── Cleaning ──
  { name: "House cleaning", category: "Cleaning", minAge: 14 },
  { name: "Move-out cleaning", category: "Cleaning", minAge: 16, note: HEAVY },
  { name: "Window cleaning (ground level)", category: "Cleaning", minAge: 14 },
  { name: "Window cleaning (above ground)", category: "Cleaning", minAge: 18, note: HAZARD },
  { name: "Garbage / trash-can cleaning", category: "Cleaning", minAge: 14 },
  { name: "Organizing & decluttering", category: "Cleaning", minAge: 14 },

  // ── Yard & outdoor ──
  { name: "Lawn mowing", category: "Yard & outdoor", minAge: 16, note: "Power mower — 16+." },
  { name: "Leaf raking", category: "Yard & outdoor", minAge: 14 },
  { name: "Snow shoveling", category: "Yard & outdoor", minAge: 14 },
  { name: "Gardening & planting", category: "Yard & outdoor", minAge: 14 },
  { name: "Mulching & soil hauling", category: "Yard & outdoor", minAge: 16, note: HEAVY },
  { name: "Fence painting", category: "Yard & outdoor", minAge: 16, note: HEAVY },
  { name: "Leaf blowing (power)", category: "Yard & outdoor", minAge: 18, note: HAZARD },
  { name: "Pressure washing", category: "Yard & outdoor", minAge: 18, note: HAZARD },
  { name: "Gutter cleaning", category: "Yard & outdoor", minAge: 18, note: HAZARD },
  { name: "Tree trimming", category: "Yard & outdoor", minAge: 18, note: HAZARD },

  // ── Pets ──
  { name: "Dog walking", category: "Pets", minAge: 14 },
  { name: "Pet sitting", category: "Pets", minAge: 14 },
  { name: "Dog washing", category: "Pets", minAge: 14 },

  // ── Kids & tutoring ──
  { name: "Babysitting", category: "Kids & tutoring", minAge: 14 },
  { name: "Math tutoring", category: "Kids & tutoring", minAge: 14 },
  { name: "Science tutoring", category: "Kids & tutoring", minAge: 14 },
  { name: "Reading & writing tutoring", category: "Kids & tutoring", minAge: 14 },
  { name: "Language tutoring", category: "Kids & tutoring", minAge: 14 },
  { name: "Test prep (SAT/ACT)", category: "Kids & tutoring", minAge: 14 },
  { name: "Music lessons", category: "Kids & tutoring", minAge: 14 },

  // ── Tech & creative ──
  { name: "Tech setup & help", category: "Tech & creative", minAge: 14 },
  { name: "Photo & video editing", category: "Tech & creative", minAge: 14 },
  { name: "Photography & videography", category: "Tech & creative", minAge: 14 },
  { name: "Graphic design", category: "Tech & creative", minAge: 14 },
  { name: "Social media help", category: "Tech & creative", minAge: 14 },
  { name: "TV mounting", category: "Tech & creative", minAge: 16, note: HEAVY },

  // ── Errands & delivery ──
  { name: "Errand running & grocery pickup", category: "Errands & delivery", minAge: 14 },
  { name: "Food delivery (bike / foot)", category: "Errands & delivery", minAge: 14 },
  { name: "Delivery driving (car)", category: "Errands & delivery", minAge: 18, note: DRIVING },

  // ── Moving & hauling ──
  { name: "Moving help", category: "Moving & hauling", minAge: 16, note: HEAVY },
  { name: "Furniture assembly", category: "Moving & hauling", minAge: 16, note: HEAVY },
  { name: "Junk hauling", category: "Moving & hauling", minAge: 16, note: HEAVY },

  // ── Car care ──
  { name: "Car washing", category: "Car care", minAge: 14 },
  { name: "Car detailing", category: "Car care", minAge: 14 },

  // ── Events & misc ──
  { name: "Party setup & cleanup", category: "Events & misc", minAge: 14 },
  { name: "Holiday decorating (ground level)", category: "Events & misc", minAge: 14 },
  { name: "Holiday lights (roof / ladder)", category: "Events & misc", minAge: 18, note: HAZARD },
  { name: "Sneaker cleaning", category: "Events & misc", minAge: 14 },
];

export const CATALOG_CATEGORY_ORDER = [
  "Cleaning",
  "Yard & outdoor",
  "Pets",
  "Kids & tutoring",
  "Tech & creative",
  "Errands & delivery",
  "Moving & hauling",
  "Car care",
  "Events & misc",
];

export function eligibleServices(age: number): CatalogService[] {
  return serviceCatalog.filter((s) => age >= s.minAge);
}
