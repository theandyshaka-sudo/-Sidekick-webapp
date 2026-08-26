import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { serviceCatalog } from "../data/serviceCatalog";
import { formatHour, formatServicePrice, type PriceType } from "../data/workerMock";
import {
  clientLocation as seedLocation,
  clientProfile as seedProfile,
  type NearbyWorker,
} from "../data/clientMock";

export type ClientProfileFields = {
  fullName: string;
  avatarUri: string;
};

export type ClientLocation = {
  zip: string;
  city: string;
};

type ClientDataState = {
  profile: ClientProfileFields;
  updateProfile: (patch: Partial<ClientProfileFields>) => void;
  location: ClientLocation;
  updateLocation: (patch: Partial<ClientLocation>) => void;
  nearbyWorkers: NearbyWorker[];
  refreshNearbyWorkers: () => void;
};

// Shape of a row returned by the discover_services() RPC (snake_case, as Postgres returns it).
type DiscoverRow = {
  service_id: string;
  worker_id: string;
  business_name: string | null;
  worker_first_name: string | null;
  avatar_uri: string | null;
  city: string | null;
  age: number | null;
  bio: string | null;
  title: string;
  price_type: PriceType;
  price_amount: number;
  avail_from: number;
  avail_to: number;
  photo_uri: string | null;
  rating_avg: number | null;
  rating_count: number;
  distance_miles: number | null;
  in_soft_zone: boolean;
};

// Rating/ratingCount/distanceMiles are all real now, computed server-side in discover_services()
// from completed bookings (ratings) and each side's geocoded lat/lng (distance, src/lib/geocode.ts).
// distanceMiles is null until both the client and that worker have a saved location. Review text
// itself is fetched on demand by the provider profile screen (worker_reviews RPC) rather than
// embedded here, since a worker can have multiple listings.
function rowToNearbyWorker(row: DiscoverRow): NearbyWorker {
  return {
    id: row.service_id,
    workerId: row.worker_id,
    name: row.worker_first_name ?? "",
    businessName: row.business_name || row.worker_first_name || "Business owner",
    avatarUri: row.avatar_uri ?? "",
    categoryId: serviceCatalog.find((s) => s.name === row.title)?.category ?? "Events & misc",
    category: row.title,
    priceLabel: formatServicePrice(row.price_type, row.price_amount),
    rating: row.rating_avg ?? 0,
    ratingCount: row.rating_count ?? 0,
    distanceMiles: row.distance_miles,
    inSoftZone: row.in_soft_zone,
    photoUri: row.photo_uri ?? "",
    availLabel: `${formatHour(row.avail_from)}–${formatHour(row.avail_to)}`,
    age: row.age ?? 0,
    bio: row.bio ?? "",
  };
}

const ClientDataContext = createContext<ClientDataState | null>(null);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ClientProfileFields>({
    fullName: seedProfile.fullName,
    avatarUri: seedProfile.avatarUri,
  });
  const [location, setLocation] = useState<ClientLocation>({ ...seedLocation });
  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const { currentUser } = useAuth();

  const refreshNearbyWorkers = () => {
    supabase.rpc("discover_services").then(({ data, error }) => {
      if (error) console.error("[discover_services] fetch failed:", error.message);
      if (data) setNearbyWorkers((data as DiscoverRow[]).map(rowToNearbyWorker));
    });
  };

  // Rehydrate the in-memory profile/location from the signed-in account (on boot, login, logout).
  // Keyed on username so edits written back under the same username aren't clobbered.
  useEffect(() => {
    if (currentUser?.role === "client") {
      setProfile({
        fullName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        avatarUri: currentUser.avatarUri,
      });
      setLocation({ zip: currentUser.zip, city: currentUser.city });
      refreshNearbyWorkers();
    } else if (!currentUser) {
      setProfile({ fullName: "", avatarUri: "" });
      setLocation({ zip: "", city: "" });
      setNearbyWorkers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  const updateProfile = (patch: Partial<ClientProfileFields>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  const updateLocation = (patch: Partial<ClientLocation>) =>
    setLocation((prev) => ({ ...prev, ...patch }));

  return (
    <ClientDataContext.Provider
      value={{
        profile,
        updateProfile,
        location,
        updateLocation,
        nearbyWorkers,
        refreshNearbyWorkers,
      }}
    >
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  const ctx = useContext(ClientDataContext);
  if (!ctx) throw new Error("useClientData must be used within ClientDataProvider");
  return ctx;
}
