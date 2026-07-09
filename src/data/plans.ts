// Business-owner subscription plans. Prices are display-only for now — real charging happens once
// Stripe Billing is wired (see Functional App Checklist). Selecting a plan just records the choice.
// Job payments are always cash and never touch these plans.

export type PlanId = "starter" | "growth" | "pro" | "crew";
export type BillingCycle = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  blurb: string;
  monthly: number;
  yearly: number;
  popular?: boolean;
  advertise: boolean;
  tracking: "basic" | "full";
  joinGroups: number | "unlimited"; // per account
  createGroups: number | "unlimited"; // per account (0 = can't create)
  accounts: number; // logins covered by one plan
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "Track your business",
    monthly: 4.99,
    yearly: 39.99,
    advertise: false,
    tracking: "basic",
    joinGroups: 1,
    createGroups: 0,
    accounts: 1,
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "Get discovered + join groups",
    monthly: 9.99,
    yearly: 99.99,
    popular: true,
    advertise: true,
    tracking: "full",
    joinGroups: 3,
    createGroups: 1,
    accounts: 1,
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "Unlimited groups",
    monthly: 14.99,
    yearly: 149.99,
    advertise: true,
    tracking: "full",
    joinGroups: "unlimited",
    createGroups: "unlimited",
    accounts: 1,
  },
  {
    id: "crew",
    name: "Crew",
    blurb: "3 accounts in one",
    monthly: 19.99,
    yearly: 199.99,
    advertise: true,
    tracking: "full",
    joinGroups: 3,
    createGroups: 1,
    accounts: 3,
  },
];

export function planById(id: PlanId | null | undefined): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "monthly" ? plan.monthly : plan.yearly;
}

// How much a year on the yearly plan saves vs paying monthly for 12 months.
export function yearlySavings(plan: Plan): number {
  return Math.round((plan.monthly * 12 - plan.yearly) * 100) / 100;
}

// The comparison rows shown on every plan card, so you can see what each has that the others don't.
export function planFeatures(plan: Plan): Array<{ text: string; included: boolean; highlight?: boolean }> {
  const joinText =
    plan.joinGroups === "unlimited"
      ? "Join unlimited groups"
      : `Join up to ${plan.joinGroups} group${plan.joinGroups === 1 ? "" : "s"}${plan.accounts > 1 ? " / account" : ""}`;
  const createText =
    plan.createGroups === 0
      ? "Create your own groups"
      : plan.createGroups === "unlimited"
        ? "Create unlimited groups"
        : `Create ${plan.createGroups} group${plan.createGroups === 1 ? "" : "s"}${plan.accounts > 1 ? " / account" : ""}`;

  return [
    { text: "Track earnings & jobs", included: true },
    { text: "Full business dashboard", included: plan.tracking === "full" },
    { text: "Advertise your business", included: plan.advertise },
    { text: joinText, included: true },
    { text: createText, included: plan.createGroups !== 0 },
    { text: plan.accounts > 1 ? `${plan.accounts} accounts included` : "1 account", included: true, highlight: plan.accounts > 1 },
  ];
}
