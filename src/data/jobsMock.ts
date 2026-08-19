import type { Role } from "../context/AppStateContext";
import type { PriceType } from "./workerMock";

export type JobStatus = "requested" | "scheduled" | "completed" | "declined";

// One shared shape for a job/booking, seen from the current user's perspective. The counterpart
// is the other party (a client if you're a worker, a worker if you're a client). Both the worker
// Jobs screen and the client Bookings screen derive their views from this.
export type Job = {
  id: string;
  service: string;
  counterpartName: string;
  counterpartAvatar: string;
  price: number;
  priceType: PriceType;
  status: JobStatus;
  scheduledAt: string | null; // ISO string; null = time not agreed yet (needs scheduling in chat)
  completedAt: string | null; // ISO string; set when the worker marks the job complete
  initiatedByMe: boolean; // did the current user create the request
  rating: number | null; // 1–5 stars the client gave the worker for this job
  reviewText: string | null; // optional written review left with the rating
  cashConfirmed: boolean; // client tapped "I paid in cash"
  // Present only for a job backed by the real `bookings` table (requested from Discover, or
  // scheduled from a real chat). Its absence means this job is local-only session state (e.g. a
  // manually-added job with no real account behind it).
  remote?: { counterpartId: string };
};

// Fresh account — no jobs yet.
export const seedJobs: Record<Role, Job[]> = {
  worker: [],
  client: [],
};
