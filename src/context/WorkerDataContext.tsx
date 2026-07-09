import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  workerProfile as seedProfile,
  workerServices as seedServices,
  type PriceType,
} from "../data/workerMock";

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

// Document-based age verification (HANDOFF §5). `verifiedDob` is set only after a successful
// verification; age is computed from it at read time (never stored as a static number). The raw
// document itself is held by the verification provider, not here — we keep only the result.
export type DocumentType = "passport" | "drivers_license" | "state_id";

// The document DOB (verifiedDob) is captured when the worker submits, but only *counts* once an
// admin approves it (status "verified"). "pending" means it's in the admin review queue.
export type Verification = {
  status: "unverified" | "pending" | "verified";
  verifiedDob: string | null; // ISO date read from the submitted document
  documentType: DocumentType | null;
};

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
  verification: Verification;
  submitForVerification: (documentType: DocumentType, dobIso: string) => void; // → pending
  approveVerification: () => void; // called when an admin approves this worker's ID
  rejectVerification: () => void;
  clearVerification: () => void;
};

const WorkerDataContext = createContext<WorkerDataState | null>(null);

export function WorkerDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<WorkerProfileFields>({
    displayName: seedProfile.displayName,
    businessName: seedProfile.businessName,
    bio: "",
    avatarUri: seedProfile.avatarUri,
  });
  const [services, setServices] = useState<WorkerServiceItem[]>(
    seedServices.map((service) => ({ ...service, active: true }))
  );
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
  const [verification, setVerification] = useState<Verification>({
    status: "unverified",
    verifiedDob: null,
    documentType: null,
  });
  const serviceIdCounter = useRef(seedServices.length);
  const { currentUser } = useAuth();

  // Rehydrate the in-memory profile from the signed-in account (on boot, login, logout). Keyed on
  // username so profile edits (which write back to the account under the same username) aren't
  // clobbered on the next render.
  useEffect(() => {
    if (currentUser?.role === "worker") {
      setProfile({
        displayName: currentUser.firstName,
        businessName: currentUser.businessName,
        bio: currentUser.bio,
        avatarUri: currentUser.avatarUri,
      });
    } else if (!currentUser) {
      setProfile({ displayName: "", businessName: "", bio: "", avatarUri: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  const updateProfile = (patch: Partial<WorkerProfileFields>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  const addService = (service: Omit<WorkerServiceItem, "id">) => {
    serviceIdCounter.current += 1;
    setServices((prev) => [...prev, { ...service, id: `svc-new-${serviceIdCounter.current}` }]);
  };

  const updateService = (id: string, patch: Partial<WorkerServiceItem>) =>
    setServices((prev) => prev.map((service) => (service.id === id ? { ...service, ...patch } : service)));

  const removeService = (id: string) => setServices((prev) => prev.filter((service) => service.id !== id));

  const updateNotificationPrefs = (patch: Partial<WorkerNotificationPrefs>) =>
    setNotificationPrefs((prev) => ({ ...prev, ...patch }));

  const updateAlarmPrefs = (patch: Partial<AlarmPrefs>) =>
    setAlarmPrefs((prev) => ({ ...prev, ...patch }));

  const submitForVerification = (documentType: DocumentType, dobIso: string) =>
    setVerification({ status: "pending", verifiedDob: dobIso, documentType });

  const approveVerification = () =>
    setVerification((prev) => ({ ...prev, status: "verified" }));

  const rejectVerification = () =>
    setVerification({ status: "unverified", verifiedDob: null, documentType: null });

  const clearVerification = () =>
    setVerification({ status: "unverified", verifiedDob: null, documentType: null });

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
        verification,
        submitForVerification,
        approveVerification,
        rejectVerification,
        clearVerification,
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
