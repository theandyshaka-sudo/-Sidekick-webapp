import { supabase } from "./supabase";

export type AgreementKey =
  | "tos"
  | "worker_ibo_agreement"
  | "client_agreement"
  | "guardian_consent_aor";

// Auth lands in M1 (see HANDOFF.md §12). Until there's a signed-in user to attach the
// acceptance to, log it rather than silently dropping it.
export async function recordLegalAcceptance(agreementKey: AgreementKey, version = "v0-draft") {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    console.log("[legal] deferred acceptance (no session yet):", agreementKey, version);
    return;
  }

  const { error } = await supabase.from("legal_acceptances").insert({
    user_id: userId,
    agreement_key: agreementKey,
    version,
  });

  if (error) {
    console.warn("[legal] failed to record acceptance:", error.message);
  }
}
