import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { generateId } from "../lib/id";
import { ageFromDob } from "../data/categoriesConfig";
import { workerProfile as seedProfile, type PriceType } from "../data/workerMock";

export type WorkerServiceItem = {
  id: string;
  title: string;
  priceType: PriceType;
  priceAmount: number;
  availFrom: number; // hour (0–23) the worker will start this service
  availTo: number; // hour (0–23) the worker will finish by
  days: number[]; // days of week offered (0 = Sun … 6 = Sat)
  photoUri: string;
  active: boolean;
};

export type WorkerProfileFields = {
  displayName: string;
  businessName: string;
  bio: string;
  avatarUri: string;
};

export type WorkerNotificationPrefs = {
  newRequests: boolean;
  messages: boolean;
  cashReminders: boolean;
  tips: boolean;
};

// Job reminder alarm — reminds the worker some minutes before each scheduled job so they have
// time to get ready. Sound is chosen from a short list of basic tones.
export type AlarmSound = "Chime" | "Bell" | "Marimba" | "Radar" | "Digital" | "Beep";

export type AlarmPrefs = {
  enabled: boolean;
  leadMinutes: number; // how long before the job the alarm goes off
  sound: AlarmSound;
};

export const ALARM_SOUNDS: AlarmSound[] = ["Chime", "Bell", "Marimba", "Radar", "Digital", "Beep"];
export const ALARM_LEAD_PRESETS = [15, 30, 45, 60, 90];

// Self-reported age — no ID, no admin review. The worker picks a number and confirms it; that's
// the whole check. `lastChangedAt` gates a once-a-month cooldown on changing it (set on the first
// pick too, so the cooldown starts counting immediately).
export type AgeInfo = {
  age: number | null;
  confirmedAt: string | null;
  lastChangedAt: string | null;
};

export type SetAgeResult =
  | { ok: true }
  | { ok: false; reason: "cooldown"; availableOn: string }
  | { ok: false; reason: "mismatch"; expectedAge: number };

type WorkerDataState = {
  profile: WorkerProfileFields;
  updateProfile: (patch: Partial<WorkerProfileFields>) => void;
  services: WorkerServiceItem[];
  addService: (service: Omit<WorkerServiceItem, "id">) => void;
  updateService: (id: string, patch: Partial<WorkerServiceItem>) => void;
  removeService: (id: string) => void;
  notificationPrefs: WorkerNotificationPrefs;
  updateNotificationPrefs: (patch: Partial<WorkerNotificationPrefs>) => void;
  alarmPrefs: AlarmPrefs;
  updateAlarmPrefs: (patch: Partial<AlarmPrefs>) => void;
  ageInfo: AgeInfo;
  setAge: (age: number) => Promise<SetAgeResult>;
};

// Shape of a row from the `worker_services` table (snake_case, as Postgres returns it).
type ServiceRow = {
  id: string;
  title: string;
  price_type: PriceType;
  price_amount: number;
  avail_from: number;
  avail_to: number;
  days: number[];
  photo_uri: string;
  active: boolean;
};

function rowToService(row: ServiceRow): WorkerServiceItem {
  return {
    id: row.id,
    title: row.title,
    priceType: row.price_type,
    priceAmount: row.price_amount,
    availFrom: row.avail_from,
    availTo: row.avail_to,
    days: row.days,
    photoUri: row.photo_uri,
    active: row.active,
  };
}

const WorkerDataContext = createContext<WorkerDataState | null>(null);

export function WorkerDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<WorkerProfileFields>({
    displayName: seedProfile.displayName,
    businessName: seedProfile.businessName,
    bio: "",
    avatarUri: seedProfile.avatarUri,
  });
  const [services, setServices] = useState<WorkerServiceItem[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<WorkerNotificationPrefs>({
    newRequests: true,
    messages: true,
    cashReminders: true,
    tips: false,
  });
  const [alarmPrefs, setAlarmPrefs] = useState<AlarmPrefs>({
    enabled: true,
    leadMinutes: 45,
    sound: "Chime",
  });
  const [ageInfo, setAgeInfo] = useState<AgeInfo>({
    age: null,
    confirmedAt: null,
    lastChangedAt: null,
  });
  const { currentUser, updateAccount } = useAuth();

  // Rehydrate the in-memory profile/age from the signed-in account (on boot, login, logout). Keyed
  // on username so profile edits (which write back to the account under the same username) aren't
  // clobbered on the next render.
  useEffect(() => {
    if (currentUser?.role === "worker") {
      setProfile({
        displayName: currentUser.firstName,
        businessName: currentUser.businessName,
        bio: currentUser.bio,
        avatarUri: currentUser.avatarUri,
      });
      setAgeInfo({
        age: currentUser.selfReportedAge,
        confirmedAt: currentUser.ageConfirmedAt,
        lastChangedAt: currentUser.ageLastChangedAt,
      });
      supabase
        .from("worker_services")
        .select("*")
        .eq("worker_id", currentUser.id)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) console.error("[worker_services] fetch failed:", error.message);
          if (data) setServices(data.map(rowToService));
        });
    } else if (!currentUser) {
      setProfile({ displayName: "", businessName: "", bio: "", avatarUri: "" });
      setAgeInfo({ age: null, confirmedAt: null, lastChangedAt: null });
      setServices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  const updateProfile = (patch: Partial<WorkerProfileFields>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  // Optimistic + fire-and-forget: local state updates immediately (so typing a price or toggling
  // a switch feels instant), the Supabase write happens in the background under the same id.
  const addService = (service: Omit<WorkerServiceItem, "id">) => {
    const id = generateId();
    setServices((prev) => [...prev, { ...service, id }]);
    if (!currentUser) return;
    supabase
      .from("worker_services")
      .insert({
        id,
        worker_id: currentUser.id,
        title: service.title,
        price_type: service.priceType,
        price_amount: service.priceAmount,
        avail_from: service.availFrom,
        avail_to: service.availTo,
        days: service.days,
        photo_uri: service.photoUri,
        active: service.active,
      })
      .then(({ error }) => {
        if (error) console.error("[worker_services] insert failed:", error.message);
      });
  };

  const updateService = (id: string, patch: Partial<WorkerServiceItem>) => {
    setServices((prev) => prev.map((service) => (service.id === id ? { ...service, ...patch } : service)));
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.priceType !== undefined) dbPatch.price_type = patch.priceType;
    if (patch.priceAmount !== undefined) dbPatch.price_amount = patch.priceAmount;
    if (patch.availFrom !== undefined) dbPatch.avail_from = patch.availFrom;
    if (patch.availTo !== undefined) dbPatch.avail_to = patch.availTo;
    if (patch.days !== undefined) dbPatch.days = patch.days;
    if (patch.photoUri !== undefined) dbPatch.photo_uri = patch.photoUri;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (Object.keys(dbPatch).length > 0) {
      supabase
        .from("worker_services")
        .update(dbPatch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("[worker_services] update failed:", error.message);
        });
    }
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((service) => service.id !== id));
    supabase
      .from("worker_services")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[worker_services] delete failed:", error.message);
      });
  };

  const updateNotificationPrefs = (patch: Partial<WorkerNotificationPrefs>) =>
    setNotificationPrefs((prev) => ({ ...prev, ...patch }));

  const updateAlarmPrefs = (patch: Partial<AlarmPrefs>) =>
    setAlarmPrefs((prev) => ({ ...prev, ...patch }));

  // Once a month, counted from the last change (or the first pick — the cooldown starts
  // immediately so age can't be flipped back and forth to dodge category gating). Persisted to
  // the `users` row so the cooldown survives an app restart.
  const setAge = async (age: number): Promise<SetAgeResult> => {
    // Cross-check against the birthday given at signup — still self-reported (no ID), but this
    // catches an honest slip or an obvious lie against the one other data point we already have.
    if (currentUser?.dobIso) {
      const expectedAge = ageFromDob(currentUser.dobIso);
      if (age !== expectedAge) return { ok: false, reason: "mismatch", expectedAge };
    }
    const now = new Date();
    if (ageInfo.lastChangedAt) {
      const availableOn = new Date(ageInfo.lastChangedAt);
      availableOn.setMonth(availableOn.getMonth() + 1);
      if (now < availableOn) return { ok: false, reason: "cooldown", availableOn: availableOn.toISOString() };
    }
    const next: AgeInfo = {
      age,
      confirmedAt: ageInfo.confirmedAt ?? now.toISOString(),
      lastChangedAt: now.toISOString(),
    };
    await updateAccount({
      selfReportedAge: next.age,
      ageConfirmedAt: next.confirmedAt,
      ageLastChangedAt: next.lastChangedAt,
    });
    setAgeInfo(next);
    return { ok: true };
  };

  return (
    <WorkerDataContext.Provider
      value={{
        profile,
        updateProfile,
        services,
        addService,
        updateService,
        removeService,
        notificationPrefs,
        updateNotificationPrefs,
        alarmPrefs,
        updateAlarmPrefs,
        ageInfo,
        setAge,
      }}
    >
      {children}
    </WorkerDataContext.Provider>
  );
}

export function useWorkerData() {
  const ctx = useContext(WorkerDataContext);
  if (!ctx) throw new Error("useWorkerData must be used within WorkerDataProvider");
  return ctx;
}
