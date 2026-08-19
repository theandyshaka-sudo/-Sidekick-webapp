import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { Role } from "./AppStateContext";
import type { PlanId, BillingCycle } from "../data/plans";

// Backed by Supabase Auth (auth.users) + the `users` table. The password never lives here —
// Supabase Auth hashes and stores it server-side.
export type StoredAccount = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string; // "" for business owners (checklist collects first name only)
  businessName: string; // "" for clients
  dobIso: string; // "" for clients (business owners give a date of birth at signup)
  email: string;
  username: string;
  zip: string;
  city: string;
  country: string;
  acceptedTerms: boolean;
  twoFactorEnabled: boolean;
  avatarUri: string;
  bio: string; // business owner "about" text; "" for clients
  plan: PlanId | null; // business owner subscription tier; null = none chosen yet
  billingCycle: BillingCycle;
  // Self-reported age (worker only) — see AgeSelector. Not checked against an ID.
  selfReportedAge: number | null;
  ageConfirmedAt: string | null;
  ageLastChangedAt: string | null;
};

export type SignUpInput = Omit<
  StoredAccount,
  "id" | "twoFactorEnabled" | "selfReportedAge" | "ageConfirmedAt" | "ageLastChangedAt"
> & { password: string };

type AuthResult = { ok: true } | { ok: false; error: string };
type LogInResult = { ok: true; account: StoredAccount } | { ok: false; error: string };

type AuthState = {
  currentUser: StoredAccount | null;
  isLoading: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  logIn: (role: Role, username: string, password: string) => Promise<LogInResult>;
  logOut: () => Promise<void>;
  // Persist profile edits (name, business, avatar, bio, location…) back onto the account row.
  updateAccount: (patch: Partial<StoredAccount>) => Promise<void>;
  setTwoFactor: (enabled: boolean) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Shape of a row from the `users` table (snake_case, as Postgres returns it).
type UserRow = {
  id: string;
  role: Role;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  dob: string | null;
  username: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  avatar_uri: string | null;
  bio: string | null;
  plan: string | null;
  billing_cycle: string | null;
  two_factor_enabled: boolean;
  self_reported_age: number | null;
  age_confirmed_at: string | null;
  age_last_changed_at: string | null;
};

function rowToAccount(row: UserRow): StoredAccount {
  return {
    id: row.id,
    role: row.role,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    businessName: row.business_name ?? "",
    dobIso: row.dob ?? "",
    email: row.email ?? "",
    username: row.username ?? "",
    zip: row.zip ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    // Reaching this row at all means the signup flow's required checkbox already ran.
    acceptedTerms: true,
    twoFactorEnabled: row.two_factor_enabled,
    avatarUri: row.avatar_uri ?? "",
    bio: row.bio ?? "",
    plan: (row.plan as PlanId | null) ?? null,
    billingCycle: (row.billing_cycle as BillingCycle) ?? "monthly",
    selfReportedAge: row.self_reported_age ?? null,
    ageConfirmedAt: row.age_confirmed_at ?? null,
    ageLastChangedAt: row.age_last_changed_at ?? null,
  };
}

async function fetchAccount(userId: string): Promise<StoredAccount | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return rowToAccount(data as UserRow);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<StoredAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      const account = userId ? await fetchAccount(userId) : null;
      if (active) {
        setCurrentUser(account);
        setIsLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        if (active) setCurrentUser(null);
        return;
      }
      const account = await fetchAccount(session.user.id);
      if (active) setCurrentUser(account);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (input: SignUpInput): Promise<AuthResult> => {
    const email = input.email.trim();
    const username = input.username.trim();

    const { data, error } = await supabase.auth.signUp({ email, password: input.password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return { ok: false, error: "An account with that email already exists." };
      }
      return { ok: false, error: error.message };
    }

    const userId = data.user?.id;
    if (!userId) return { ok: false, error: "Something went wrong creating your account. Try again." };

    if (!data.session) {
      // Email confirmation is required on this project, so there's no session yet to write the
      // profile row under. Ask them to confirm, then this same flow completes on first login.
      return {
        ok: false,
        error: "Account created — check your inbox for a confirmation link, then log in.",
      };
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      email,
      role: input.role,
      first_name: input.firstName,
      last_name: input.lastName,
      business_name: input.businessName,
      dob: input.dobIso ? input.dobIso.slice(0, 10) : null,
      username,
      zip: input.zip,
      city: input.city,
      country: input.country,
      avatar_uri: input.avatarUri,
      bio: input.bio,
      plan: input.plan,
      billing_cycle: input.billingCycle,
    });
    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes("username")) return { ok: false, error: "That username is already taken." };
      return { ok: false, error: insertError.message };
    }

    await supabase.from("legal_acceptances").insert({
      user_id: userId,
      agreement_key: input.role === "worker" ? "worker_ibo_agreement" : "client_agreement",
      version: "v1",
    });

    setCurrentUser({
      id: userId,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      businessName: input.businessName,
      dobIso: input.dobIso,
      email,
      username,
      zip: input.zip,
      city: input.city,
      country: input.country,
      acceptedTerms: true,
      twoFactorEnabled: false,
      avatarUri: input.avatarUri,
      bio: input.bio,
      plan: input.plan,
      billingCycle: input.billingCycle,
      selfReportedAge: null,
      ageConfirmedAt: null,
      ageLastChangedAt: null,
    });
    return { ok: true };
  };

  const logIn = async (role: Role, username: string, password: string): Promise<LogInResult> => {
    const { data: email, error: lookupError } = await supabase.rpc("email_for_username", {
      lookup_username: username.trim(),
    });
    if (lookupError || !email) return { ok: false, error: "No account found with that username." };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: "Incorrect password." };

    const account = await fetchAccount(data.user.id);
    if (!account) return { ok: false, error: "Couldn't load your account. Try again." };

    if (account.role !== role) {
      await supabase.auth.signOut();
      return {
        ok: false,
        error: `That username is registered as a ${account.role === "worker" ? "business owner" : "client"}.`,
      };
    }

    setCurrentUser(account);
    return { ok: true, account };
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const updateAccount = async (patch: Partial<StoredAccount>) => {
    if (!currentUser) return;
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const dbPatch: Record<string, unknown> = {};
    if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
    if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
    if (patch.businessName !== undefined) dbPatch.business_name = patch.businessName;
    if (patch.dobIso !== undefined) dbPatch.dob = patch.dobIso ? patch.dobIso.slice(0, 10) : null;
    if (patch.username !== undefined) dbPatch.username = patch.username;
    if (patch.zip !== undefined) dbPatch.zip = patch.zip;
    if (patch.city !== undefined) dbPatch.city = patch.city;
    if (patch.country !== undefined) dbPatch.country = patch.country;
    if (patch.avatarUri !== undefined) dbPatch.avatar_uri = patch.avatarUri;
    if (patch.bio !== undefined) dbPatch.bio = patch.bio;
    if (patch.plan !== undefined) dbPatch.plan = patch.plan;
    if (patch.billingCycle !== undefined) dbPatch.billing_cycle = patch.billingCycle;
    if (patch.twoFactorEnabled !== undefined) dbPatch.two_factor_enabled = patch.twoFactorEnabled;
    if (patch.selfReportedAge !== undefined) dbPatch.self_reported_age = patch.selfReportedAge;
    if (patch.ageConfirmedAt !== undefined) dbPatch.age_confirmed_at = patch.ageConfirmedAt;
    if (patch.ageLastChangedAt !== undefined) dbPatch.age_last_changed_at = patch.ageLastChangedAt;

    const { error } = await supabase.from("users").update(dbPatch).eq("id", userId);
    if (error) return;
    setCurrentUser({ ...currentUser, ...patch });
  };

  const setTwoFactor = async (enabled: boolean) => {
    await updateAccount({ twoFactorEnabled: enabled });
  };

  const requestPasswordReset = async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email);
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
