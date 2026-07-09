import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "./AppStateContext";

// A locally-stored account. This is the demo/offline backing store — when the real backend
// lands, these records move server-side and the password is hashed there (never stored in
// plaintext like this). `dobIso`/`businessName` are worker-only; `lastName` is client-only.
export type StoredAccount = {
  role: Role;
  firstName: string;
  lastName: string; // "" for business owners (checklist collects first name only)
  businessName: string; // "" for clients
  dobIso: string; // "" for clients (business owners give a date of birth at signup)
  email: string;
  username: string;
  password: string; // plaintext — demo only; a real backend hashes server-side
  zip: string;
  city: string;
  country: string;
  acceptedTerms: boolean;
  twoFactorEnabled: boolean;
  avatarUri: string;
  bio: string; // business owner "about" text; "" for clients
};

export type SignUpInput = Omit<StoredAccount, "twoFactorEnabled">;

type AuthResult = { ok: true } | { ok: false; error: string };
type LogInResult = { ok: true; account: StoredAccount } | { ok: false; error: string };

type AuthState = {
  currentUser: StoredAccount | null;
  isLoading: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  logIn: (role: Role, username: string, password: string) => Promise<LogInResult>;
  logOut: () => Promise<void>;
  // Persist profile edits (name, business, avatar, bio, location…) back onto the stored account.
  updateAccount: (patch: Partial<StoredAccount>) => Promise<void>;
  setTwoFactor: (enabled: boolean) => Promise<void>;
  // Stubbed — a real reset emails a link. We only report that the request was accepted.
  requestPasswordReset: (email: string) => Promise<void>;
};

const ACCOUNTS_KEY = "sidekick.accounts";
const CURRENT_KEY = "sidekick.currentUser";

const AuthContext = createContext<AuthState | null>(null);

async function readAccounts(): Promise<StoredAccount[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<StoredAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await readAccounts();
      setAccounts(stored);
      const rawCurrent = await AsyncStorage.getItem(CURRENT_KEY);
      if (rawCurrent) {
        try {
          setCurrentUser(JSON.parse(rawCurrent) as StoredAccount);
        } catch {
          // ignore corrupt session
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const persistAccounts = async (next: StoredAccount[]) => {
    setAccounts(next);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  };

  const persistCurrent = async (account: StoredAccount | null) => {
    setCurrentUser(account);
    if (account) await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(account));
    else await AsyncStorage.removeItem(CURRENT_KEY);
  };

  const signUp = async (input: SignUpInput): Promise<AuthResult> => {
    const uname = input.username.trim().toLowerCase();
    if (accounts.some((a) => a.username.trim().toLowerCase() === uname)) {
      return { ok: false, error: "That username is already taken." };
    }
    if (accounts.some((a) => a.email.trim().toLowerCase() === input.email.trim().toLowerCase())) {
      return { ok: false, error: "An account with that email already exists." };
    }
    const account: StoredAccount = { ...input, twoFactorEnabled: false };
    await persistAccounts([...accounts, account]);
    await persistCurrent(account);
    return { ok: true };
  };

  const logIn = async (role: Role, username: string, password: string): Promise<LogInResult> => {
    const uname = username.trim().toLowerCase();
    const match = accounts.find((a) => a.username.trim().toLowerCase() === uname);
    if (!match) return { ok: false, error: "No account found with that username." };
    if (match.password !== password) return { ok: false, error: "Incorrect password." };
    if (match.role !== role) {
      return {
        ok: false,
        error: `That username is registered as a ${match.role === "worker" ? "business owner" : "client"}.`,
      };
    }
    await persistCurrent(match);
    return { ok: true, account: match };
  };

  const logOut = async () => {
    await persistCurrent(null);
  };

  const updateAccount = async (patch: Partial<StoredAccount>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...patch };
    await persistCurrent(updated);
    await persistAccounts(accounts.map((a) => (a.username === updated.username ? updated : a)));
  };

  const setTwoFactor = async (enabled: boolean) => {
    await updateAccount({ twoFactorEnabled: enabled });
  };

  // Real password reset needs the email provider (3rd-party). Until then this is a no-op that
  // always "succeeds" so the UI can show a neutral confirmation.
  const requestPasswordReset = async (_email: string) => {
    return;
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isLoading, signUp, logIn, logOut, updateAccount, setTwoFactor, requestPasswordReset }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
