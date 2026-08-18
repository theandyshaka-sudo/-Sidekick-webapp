import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { clientLocation as seedLocation, clientProfile as seedProfile } from "../data/clientMock";

export type ClientProfileFields = {
  fullName: string;
  avatarUri: string;
};

export type ClientLocation = {
  zip: string;
  city: string;
};

export type ClientNotificationPrefs = {
  bookingUpdates: boolean;
  messages: boolean;
  promos: boolean;
};

type ClientDataState = {
  profile: ClientProfileFields;
  updateProfile: (patch: Partial<ClientProfileFields>) => void;
  location: ClientLocation;
  updateLocation: (patch: Partial<ClientLocation>) => void;
  notificationPrefs: ClientNotificationPrefs;
  updateNotificationPrefs: (patch: Partial<ClientNotificationPrefs>) => void;
};

const ClientDataContext = createContext<ClientDataState | null>(null);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ClientProfileFields>({
    fullName: seedProfile.fullName,
    avatarUri: seedProfile.avatarUri,
  });
  const [location, setLocation] = useState<ClientLocation>({ ...seedLocation });
  const [notificationPrefs, setNotificationPrefs] = useState<ClientNotificationPrefs>({
    bookingUpdates: true,
    messages: true,
    promos: false,
  });
  const { currentUser } = useAuth();

  // Rehydrate the in-memory profile/location from the signed-in account (on boot, login, logout).
  // Keyed on username so edits written back under the same username aren't clobbered.
  useEffect(() => {
    if (currentUser?.role === "client") {
      setProfile({
        fullName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        avatarUri: currentUser.avatarUri,
      });
      setLocation({ zip: currentUser.zip, city: currentUser.city });
    } else if (!currentUser) {
      setProfile({ fullName: "", avatarUri: "" });
      setLocation({ zip: "", city: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  const updateProfile = (patch: Partial<ClientProfileFields>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  const updateLocation = (patch: Partial<ClientLocation>) =>
    setLocation((prev) => ({ ...prev, ...patch }));

  const updateNotificationPrefs = (patch: Partial<ClientNotificationPrefs>) =>
    setNotificationPrefs((prev) => ({ ...prev, ...patch }));

  return (
    <ClientDataContext.Provider
      value={{
        profile,
        updateProfile,
        location,
        updateLocation,
        notificationPrefs,
        updateNotificationPrefs,
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
