import type { Role } from "../context/AppStateContext";
import type { PriceType } from "./workerMock";

export type JobOffer = {
  service: string;
  price: number;
  priceType: PriceType;
  scheduledAt: string; // ISO
  status: "pending" | "accepted" | "declined";
};

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  time: string;
  kind: "text" | "offer";
  text?: string;
  offer?: JobOffer;
  edited?: boolean;
  deleted?: boolean;
};

export type ReportReason = "harassment" | "spam" | "inappropriate" | "scam" | "safety" | "other";

// A report record shown in the developer dashboard. `platformReports` below stands in for
// reports filed by other users across SideKick; the dashboard also surfaces any reports filed
// during the current session (see MessagesContext.getAllReports).
export type ReportMessage = { fromReported: boolean; text: string; time: string };

export type ReportStatus = "open" | "resolved" | "dismissed";

export type PlatformReport = {
  id: string;
  reporterRole: Role;
  reporterName: string;
  reportedName: string;
  reason: ReportReason;
  context: string;
  time: string;
  blocked: boolean;
  status: ReportStatus; // set from the moderation-action map in MessagesContext.getAllReports
  messages: ReportMessage[]; // transcript the moderator reviews before acting
};

// Fresh account — no reports filed yet.
export const platformReports: PlatformReport[] = [];

export type Conversation = {
  id: string;
  // The person on the other side of the chat (a client if you're a worker, a worker if you're a
  // client). `counterpartRating` is that person's rating — a worker seeing a client's customer
  // rating is intentional (checklist: "Customer Rating (only the business owner sees)").
  counterpartName: string;
  counterpartAvatar: string;
  counterpartRating: number;
  jobContext: string;
  messages: ChatMessage[];
  unread: number; // unread incoming messages, shown as a badge until the chat is opened
  reported: boolean;
  reportReason: ReportReason | null;
  blocked: boolean;
};

// Fresh account — no conversations yet.
export const seedConversations: Record<Role, Conversation[]> = {
  worker: [],
  client: [],
};
