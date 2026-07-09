import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useAppState } from "./AppStateContext";
import {
  platformReports,
  seedConversations,
  type ChatMessage,
  type Conversation,
  type JobOffer,
  type PlatformReport,
  type ReportReason,
  type ReportStatus,
} from "../data/messagesMock";
import { sanitizeMessage } from "../lib/sanitizeMessage";
import type { Role } from "./AppStateContext";

type SendResult = { redacted: boolean };

type MessagesState = {
  conversations: Conversation[];
  totalUnread: number;
  getConversation: (id: string) => Conversation | undefined;
  ensureConversation: (counterpartName: string, counterpartAvatar: string, jobContext: string, counterpartRating?: number) => string;
  markConversationRead: (conversationId: string) => void;
  sendMessage: (conversationId: string, text: string) => SendResult;
  editMessage: (conversationId: string, messageId: string, text: string) => SendResult;
  deleteMessage: (conversationId: string, messageId: string) => void;
  sendOffer: (conversationId: string, offer: Omit<JobOffer, "status">) => void;
  setOfferStatus: (conversationId: string, messageId: string, status: JobOffer["status"]) => void;
  reportConversation: (conversationId: string, reason: ReportReason) => void;
  // File a standalone report (e.g. reporting a group or a group member) into the admin console.
  fileReport: (input: { reportedName: string; reason: ReportReason; context: string }) => void;
  setBlocked: (conversationId: string, blocked: boolean) => void;
  getAllReports: () => PlatformReport[];
  setReportStatus: (reportId: string, status: ReportStatus) => void;
  // Platform-level messaging ban applied from the developer console. A banned user can't send
  // messages anywhere until the ban expires. `hours` may be Infinity for a permanent ban.
  banMessaging: (name: string, hours: number) => void;
  unbanMessaging: (name: string) => void;
  banStatus: (name: string) => { banned: boolean; label: string };
};

const MessagesContext = createContext<MessagesState | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [byRole, setByRole] = useState(() => ({
    worker: seedConversations.worker.map((c) => ({ ...c, messages: [...c.messages] })),
    client: seedConversations.client.map((c) => ({ ...c, messages: [...c.messages] })),
  }));
  // Platform-wide messaging bans: user name -> expiry timestamp (ms). Not per-role — a ban
  // applies to that person everywhere.
  const [bannedUntil, setBannedUntil] = useState<Record<string, number>>({});
  // Moderation actions on reports: report id -> resolved/dismissed (open is the default).
  const [reportStatuses, setReportStatuses] = useState<Record<string, ReportStatus>>({});
  // Standalone reports filed this session (e.g. group/member reports), shown in the admin console.
  const [filedReports, setFiledReports] = useState<PlatformReport[]>([]);
  const idCounter = useRef(0);
  const { role } = useAppState();
  const activeRole = role ?? "client";
  const conversations = byRole[activeRole];

  const nextId = (prefix: string) => {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  };

  const updateConversations = (mutate: (list: Conversation[]) => Conversation[]) =>
    setByRole((prev) => ({ ...prev, [activeRole]: mutate(prev[activeRole]) }));

  const updateMessages = (conversationId: string, mutate: (messages: ChatMessage[]) => ChatMessage[]) =>
    updateConversations((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, messages: mutate(c.messages) } : c))
    );

  const getConversation = (id: string) => conversations.find((c) => c.id === id);

  const ensureConversation = (
    counterpartName: string,
    counterpartAvatar: string,
    jobContext: string,
    counterpartRating = 5
  ): string => {
    const existing = conversations.find((c) => c.counterpartName === counterpartName);
    if (existing) return existing.id;
    const id = nextId("conv");
    const conversation: Conversation = {
      id,
      counterpartName,
      counterpartAvatar,
      counterpartRating,
      jobContext,
      messages: [],
      unread: 0,
      reported: false,
      reportReason: null,
      blocked: false,
    };
    updateConversations((list) => [conversation, ...list]);
    return id;
  };

  const markConversationRead = (conversationId: string) =>
    updateConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const sendMessage = (conversationId: string, text: string): SendResult => {
    const { text: clean, redacted } = sanitizeMessage(text);
    const message: ChatMessage = { id: nextId("m"), fromMe: true, kind: "text", text: clean, time: "Now" };
    updateMessages(conversationId, (messages) => [...messages, message]);
    return { redacted };
  };

  const editMessage = (conversationId: string, messageId: string, text: string): SendResult => {
    const { text: clean, redacted } = sanitizeMessage(text);
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, text: clean, edited: true } : m))
    );
    return { redacted };
  };

  const deleteMessage = (conversationId: string, messageId: string) =>
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, deleted: true } : m))
    );

  const sendOffer = (conversationId: string, offer: Omit<JobOffer, "status">) => {
    const message: ChatMessage = {
      id: nextId("m"),
      fromMe: true,
      kind: "offer",
      time: "Now",
      offer: { ...offer, status: "pending" },
    };
    updateMessages(conversationId, (messages) => [...messages, message]);
  };

  const setOfferStatus = (conversationId: string, messageId: string, status: JobOffer["status"]) =>
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId && m.offer ? { ...m, offer: { ...m.offer, status } } : m))
    );

  const reportConversation = (conversationId: string, reason: ReportReason) =>
    updateConversations((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, reported: true, reportReason: reason } : c))
    );

  const fileReport = (input: { reportedName: string; reason: ReportReason; context: string }) => {
    const id = nextId("report");
    setFiledReports((prev) => [
      {
        id,
        reporterRole: activeRole,
        reporterName: "You (this session)",
        reportedName: input.reportedName,
        reason: input.reason,
        context: input.context,
        time: "Just now",
        blocked: false,
        status: "open",
        messages: [],
      },
      ...prev,
    ]);
  };

  const setBlocked = (conversationId: string, blocked: boolean) =>
    updateConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, blocked } : c)));

  // All reports visible to the developer console: the platform seed (other users' reports) plus
  // any conversation reported during this session, scanned across both role inboxes.
  const getAllReports = (): PlatformReport[] => {
    const live: PlatformReport[] = [];
    (Object.keys(byRole) as Role[]).forEach((r) => {
      byRole[r].forEach((c) => {
        if (c.reported && c.reportReason) {
          const id = `live-${r}-${c.id}`;
          live.push({
            id,
            reporterRole: r,
            reporterName: "You (this session)",
            reportedName: c.counterpartName,
            reason: c.reportReason,
            context: c.jobContext,
            time: "Just now",
            blocked: c.blocked,
            status: reportStatuses[id] ?? "open",
            messages: c.messages
              .filter((m) => m.kind === "text" || m.deleted)
              .map((m) => ({
                fromReported: !m.fromMe,
                text: m.deleted ? "(deleted)" : (m.text ?? ""),
                time: m.time,
              })),
          });
        }
      });
    });
    const filed = filedReports.map((r) => ({ ...r, status: reportStatuses[r.id] ?? r.status }));
    const seeds = platformReports.map((r) => ({ ...r, status: reportStatuses[r.id] ?? r.status }));
    return [...live, ...filed, ...seeds];
  };

  const setReportStatus = (reportId: string, status: ReportStatus) =>
    setReportStatuses((prev) => ({ ...prev, [reportId]: status }));

  const banMessaging = (name: string, hours: number) =>
    setBannedUntil((prev) => ({
      ...prev,
      [name]: hours === Infinity ? Infinity : Date.now() + hours * 60 * 60 * 1000,
    }));

  const unbanMessaging = (name: string) =>
    setBannedUntil((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const banStatus = (name: string) => {
    const expiry = bannedUntil[name];
    if (expiry === Infinity) return { banned: true, label: "Permanent" };
    if (!expiry || expiry <= Date.now()) return { banned: false, label: "" };
    const hoursLeft = Math.ceil((expiry - Date.now()) / (60 * 60 * 1000));
    const label = hoursLeft >= 48 ? `${Math.ceil(hoursLeft / 24)}d left` : `${hoursLeft}h left`;
    return { banned: true, label };
  };

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        totalUnread,
        getConversation,
        ensureConversation,
        markConversationRead,
        sendMessage,
        editMessage,
        deleteMessage,
        sendOffer,
        setOfferStatus,
        reportConversation,
        fileReport,
        setBlocked,
        getAllReports,
        setReportStatus,
        banMessaging,
        unbanMessaging,
        banStatus,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
