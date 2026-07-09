import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useAppState } from "./AppStateContext";
import { seedJobs, type Job, type JobStatus } from "../data/jobsMock";
import type { PriceType } from "../data/workerMock";

function daysAgo(iso: string | null): number {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

type NewRequest = {
  service: string;
  counterpartName: string;
  counterpartAvatar: string;
  price: number;
  priceType: PriceType;
};

type ScheduleInput = NewRequest & { scheduledAt: string };
type ManualInput = ScheduleInput & { status: Extract<JobStatus, "scheduled" | "completed"> };

export type Review = { id: string; author: string; avatar: string; rating: number; text: string; date: string };

type JobsState = {
  jobs: Job[];
  requests: Job[];
  upcoming: Job[]; // scheduled, soonest first
  completed: Job[];
  earnings: { thisWeek: number; thisMonth: number; lifetime: number };
  rating: { average: number; count: number };
  reviews: Review[]; // completed jobs with a written review, newest first
  weeklyEarnings: number[]; // last 6 weeks of completed earnings, oldest → newest
  streakWeeks: number; // consecutive weeks (ending this week) with ≥1 completed job
  requestJob: (input: NewRequest) => string;
  declineRequest: (id: string) => void;
  // Accept a time offer: upgrade a matching pending request to scheduled, or create a new
  // scheduled job if none matches (e.g. an offer sent out of the blue).
  scheduleFromOffer: (input: ScheduleInput) => void;
  completeJob: (id: string, finalPrice: number) => void;
  rateJob: (id: string, rating: number, reviewText?: string) => void;
  confirmCash: (id: string) => void;
  addManualJob: (input: ManualInput) => void;
};

const JobsContext = createContext<JobsState | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [byRole, setByRole] = useState(() => ({
    worker: seedJobs.worker.map((j) => ({ ...j })),
    client: seedJobs.client.map((j) => ({ ...j })),
  }));
  const idCounter = useRef(0);
  const { role } = useAppState();
  const activeRole = role ?? "client";
  const jobs = byRole[activeRole];

  const update = (mutate: (list: Job[]) => Job[]) =>
    setByRole((prev) => ({ ...prev, [activeRole]: mutate(prev[activeRole]) }));

  const requestJob = (input: NewRequest): string => {
    idCounter.current += 1;
    const id = `job-new-${idCounter.current}`;
    const job: Job = {
      id,
      ...input,
      status: "requested",
      scheduledAt: null,
      completedAt: null,
      initiatedByMe: true,
      rating: null,
      reviewText: null,
      cashConfirmed: false,
    };
    update((list) => [job, ...list]);
    return id;
  };

  const declineRequest = (id: string) =>
    update((list) => list.map((j) => (j.id === id ? { ...j, status: "declined" } : j)));

  const scheduleFromOffer = (input: ScheduleInput) => {
    update((list) => {
      const match = list.find(
        (j) => j.status === "requested" && j.counterpartName === input.counterpartName
      );
      if (match) {
        return list.map((j) =>
          j.id === match.id
            ? {
                ...j,
                service: input.service,
                price: input.price,
                priceType: input.priceType,
                status: "scheduled",
                scheduledAt: input.scheduledAt,
              }
            : j
        );
      }
      idCounter.current += 1;
      const job: Job = {
        id: `job-new-${idCounter.current}`,
        ...input,
        status: "scheduled",
        completedAt: null,
        initiatedByMe: false,
        rating: null,
        reviewText: null,
        cashConfirmed: false,
      };
      return [job, ...list];
    });
  };

  const completeJob = (id: string, finalPrice: number) =>
    update((list) =>
      list.map((j) =>
        j.id === id
          ? { ...j, status: "completed", price: finalPrice, completedAt: new Date().toISOString() }
          : j
      )
    );

  const rateJob = (id: string, rating: number, reviewText?: string) =>
    update((list) =>
      list.map((j) => (j.id === id ? { ...j, rating, reviewText: reviewText?.trim() || j.reviewText } : j))
    );

  const confirmCash = (id: string) =>
    update((list) => list.map((j) => (j.id === id ? { ...j, cashConfirmed: true } : j)));

  const addManualJob = (input: ManualInput) => {
    idCounter.current += 1;
    const job: Job = {
      id: `job-new-${idCounter.current}`,
      service: input.service,
      counterpartName: input.counterpartName,
      counterpartAvatar: input.counterpartAvatar,
      price: input.price,
      priceType: input.priceType,
      status: input.status,
      scheduledAt: input.scheduledAt,
      completedAt: input.status === "completed" ? new Date().toISOString() : null,
      initiatedByMe: true,
      rating: null,
      reviewText: null,
      cashConfirmed: false,
    };
    update((list) => [job, ...list]);
  };

  const derived = useMemo(() => {
    const requests = jobs.filter((j) => j.status === "requested");
    const upcoming = jobs
      .filter((j) => j.status === "scheduled")
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
    const completed = jobs
      .filter((j) => j.status === "completed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

    const done = jobs.filter((j) => j.status === "completed");
    const earnings = {
      lifetime: done.reduce((sum, j) => sum + j.price, 0),
      thisMonth: done.filter((j) => daysAgo(j.completedAt) <= 30).reduce((s, j) => s + j.price, 0),
      thisWeek: done.filter((j) => daysAgo(j.completedAt) <= 7).reduce((s, j) => s + j.price, 0),
    };

    const rated = done.filter((j) => j.rating != null);
    const rating = {
      average: rated.length ? rated.reduce((s, j) => s + (j.rating ?? 0), 0) / rated.length : 0,
      count: rated.length,
    };

    const reviews: Review[] = completed
      .filter((j) => j.rating != null && j.reviewText)
      .map((j) => ({
        id: j.id,
        author: j.counterpartName,
        avatar: j.counterpartAvatar,
        rating: j.rating as number,
        text: j.reviewText as string,
        date: j.completedAt as string,
      }));

    // Earnings per week for the last 6 weeks (bucket 0 = 5 weeks ago … bucket 5 = this week).
    const weeklyEarnings = Array.from({ length: 6 }, (_, i) => {
      const weeksAgo = 5 - i;
      return done
        .filter((j) => {
          const d = daysAgo(j.completedAt);
          return d >= weeksAgo * 7 && d < (weeksAgo + 1) * 7;
        })
        .reduce((s, j) => s + j.price, 0);
    });

    // Count consecutive weeks (ending this week) that each have at least one completed job.
    let streakWeeks = 0;
    for (let w = 0; w < 52; w++) {
      const hasJob = done.some((j) => {
        const d = daysAgo(j.completedAt);
        return d >= w * 7 && d < (w + 1) * 7;
      });
      if (hasJob) streakWeeks += 1;
      else break;
    }

    return { requests, upcoming, completed, earnings, rating, reviews, weeklyEarnings, streakWeeks };
  }, [jobs]);

  return (
    <JobsContext.Provider
      value={{
        jobs,
        ...derived,
        requestJob,
        declineRequest,
        scheduleFromOffer,
        completeJob,
        rateJob,
        confirmCash,
        addManualJob,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}
