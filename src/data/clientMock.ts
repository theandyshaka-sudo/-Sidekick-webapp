// Category chips shown on Discover. `nearbyWorkers` is empty on a fresh account — real listings
// arrive once M1/M2 (auth, listings) land.

export type Category = {
  id: string;
  title: string;
  icon: string;
};

export const categories: Category[] = [
  { id: "yard", title: "Yard work", icon: "leaf-outline" },
  { id: "cleaning", title: "Cleaning", icon: "sparkles-outline" },
  { id: "moving", title: "Moving help", icon: "cube-outline" },
  { id: "petcare", title: "Pet care", icon: "paw-outline" },
  { id: "tutoring", title: "Tutoring", icon: "book-outline" },
  { id: "errands", title: "Errands", icon: "bicycle-outline" },
];

export type NearbyWorker = {
  id: string;
  name: string;
  businessName: string;
  avatarUri: string;
  categoryId: string;
  category: string;
  priceLabel: string;
  rating: number;
  ratingCount: number;
  distanceMiles: number;
  availLabel: string; // hours this worker is willing to work, e.g. "12 PM–4 PM"
  age: number; // shown to clients only once the business owner is age-verified
  ageVerified: boolean;
  bio: string;
  reviews: Array<{ author: string; stars: number; text: string }>;
};

// Fresh account — no business owners listed nearby yet.
export const nearbyWorkers: NearbyWorker[] = [];

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
