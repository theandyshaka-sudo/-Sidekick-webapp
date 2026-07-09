import type { Ionicons } from "@expo/vector-icons";
import type { AgreementKey } from "../lib/legal";

export const legalCopy: Record<
  "worker" | "client",
  { icon: keyof typeof Ionicons.glyphMap; heading: string; body: string; agreementKey: AgreementKey }
> = {
  worker: {
    icon: "storefront-outline",
    heading: "Independent Business Owner Agreement",
    agreementKey: "worker_ibo_agreement",
    body:
      "You're joining SideKick as an independent business owner, not an employee. You set your own prices, choose which jobs to accept, and control how you do the work. SideKick is an advertising and introduction platform only — it does not employ, direct, or supervise you.\n\n" +
      "By continuing, you agree to the Platform Terms of Service and the Independent Business Owner Agreement, and confirm you'll operate lawfully and within SideKick's age and category rules.",
  },
  client: {
    icon: "shield-checkmark-outline",
    heading: "Client Agreement",
    agreementKey: "client_agreement",
    body:
      "Business owners on SideKick are independent third parties — not SideKick employees, and not vetted as employees. You're responsible for a safe environment at your premises.\n\n" +
      "By continuing, you agree to the Platform Terms of Service and the Client Agreement, including consent to a background check and assumption of risk.",
  },
};
