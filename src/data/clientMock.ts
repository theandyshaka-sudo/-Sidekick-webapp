// Category chips shown on Discover — derived from the same catalog workers pick services from
// (serviceCatalog.ts), so a chip always matches at least one real listing category.
import { CATALOG_CATEGORY_ORDER } from "./serviceCatalog";

export type Category = {
  id: string;
  title: string;
  icon: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  "Cleaning": "sparkles-outline",
  "Yard & outdoor": "leaf-outline",
  "Pets": "paw-outline",
  "Kids & tutoring": "book-outline",
  "Tech & creative": "laptop-outline",
  "Errands & delivery": "bicycle-outline",
  "Moving & hauling": "cube-outline",
  "Car care": "car-outline",
  "Events & misc": "gift-outline",
};

export const categories: Category[] = CATALOG_CATEGORY_ORDER.map((title) => ({
  id: title,
  title,
  icon: CATEGORY_ICONS[title] ?? "ellipsis-horizontal-outline",
}));

export type NearbyWorker = {
  id: string;
  workerId: string; // the worker's real account id — needed to start a real conversation
  name: string;
  businessName: string;
  avatarUri: string;
  categoryId: string;
  category: string;
  priceLabel: string;
  rating: number;
  ratingCount: number;
  distanceMiles: number | null; // null until both the client and this worker have a saved location
  inSoftZone: boolean; // true when just past the worker's travel radius but still shown, not hidden
  availLabel: string; // hours this worker is willing to work, e.g. "12 PM–4 PM"
  age: number; // self-reported by the business owner, not verified
  bio: string;
};

// The signed-in client — blank until they fill in their profile.
export const clientProfile = {
  fullName: "",
  avatarUri: "",
  trustTier: "New" as const,
  memberSince: "Jul 2026",
};

// Where the client is searching for help — a zip and the city/neighborhood it falls in.
export const clientLocation = {
  zip: "",
  city: "",
};
