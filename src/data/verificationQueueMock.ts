import type { DocumentType } from "../context/WorkerDataContext";
import type { Role } from "../context/AppStateContext";

export type SubmissionStatus = "pending" | "approved" | "rejected";

// An ID submitted for manual review in the admin console. Business owners submit to verify their
// age; clients submit to verify their identity. `photoUri` is the mug shot printed on the mock ID;
// `idNumber` and `state` dress it up like a real card for the reviewer.
export type IdSubmission = {
  id: string;
  name: string;
  submitterRole: Role; // "worker" (age) or "client" (identity)
  documentType: DocumentType;
  dobIso: string; // date of birth printed on the document
  idNumber: string;
  state: string;
  photoUri: string;
  submittedAt: string;
  status: SubmissionStatus;
  isCurrentUser?: boolean; // true for the logged-in user's own submission
};

// Fresh account — no IDs waiting for review.
export const seedSubmissions: IdSubmission[] = [];
