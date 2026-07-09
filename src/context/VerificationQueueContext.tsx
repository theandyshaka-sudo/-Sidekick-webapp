import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useWorkerData, type DocumentType } from "./WorkerDataContext";
import { useClientData } from "./ClientDataContext";
import type { Role } from "./AppStateContext";
import { seedSubmissions, type IdSubmission } from "../data/verificationQueueMock";

type NewSubmission = {
  name: string;
  submitterRole: Role;
  documentType: DocumentType;
  dobIso: string;
  photoUri: string;
};

type VerificationQueueState = {
  submissions: IdSubmission[];
  pendingCount: number;
  submitId: (input: NewSubmission) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
};

const VerificationQueueContext = createContext<VerificationQueueState | null>(null);

function randomIdNumber(counter: number): string {
  return `NY-${5000 + counter}-${1000 + counter * 7}`;
}

export function VerificationQueueProvider({ children }: { children: ReactNode }) {
  const [submissions, setSubmissions] = useState<IdSubmission[]>(seedSubmissions.map((s) => ({ ...s })));
  const counter = useRef(seedSubmissions.length);
  // Approving the logged-in user's own ID flips their account to verified — a business owner's age
  // or a client's identity, depending on who submitted.
  const worker = useWorkerData();
  const client = useClientData();

  const submitId = (input: NewSubmission) => {
    counter.current += 1;
    const submission: IdSubmission = {
      id: `sub-new-${counter.current}`,
      name: input.name,
      submitterRole: input.submitterRole,
      documentType: input.documentType,
      dobIso: input.dobIso,
      idNumber: randomIdNumber(counter.current),
      state: input.documentType === "passport" ? "United States" : "New York",
      photoUri: input.photoUri,
      submittedAt: "Just now",
      status: "pending",
      isCurrentUser: true,
    };
    // Replace any earlier submission from this user so the queue shows only the latest.
    setSubmissions((prev) => [submission, ...prev.filter((s) => !s.isCurrentUser)]);
  };

  const approve = (id: string) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s)));
    const target = submissions.find((s) => s.id === id);
    if (target?.isCurrentUser) {
      if (target.submitterRole === "worker") worker.approveVerification();
      else client.approveVerification();
    }
  };

  const reject = (id: string) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s)));
    const target = submissions.find((s) => s.id === id);
    if (target?.isCurrentUser) {
      if (target.submitterRole === "worker") worker.rejectVerification();
      else client.rejectVerification();
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <VerificationQueueContext.Provider value={{ submissions, pendingCount, submitId, approve, reject }}>
      {children}
    </VerificationQueueContext.Provider>
  );
}

export function useVerificationQueue() {
  const ctx = useContext(VerificationQueueContext);
  if (!ctx) throw new Error("useVerificationQueue must be used within VerificationQueueProvider");
  return ctx;
}
