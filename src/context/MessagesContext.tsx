import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAppState } from "./AppStateContext";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { generateId } from "../lib/id";
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
import { formatTime } from "../lib/datetime";
import type { Role } from "./AppStateContext";
import type { PriceType } from "../data/workerMock";

type SendResult = { redacted: boolean };

// Shape of a row from `my_conversations()` (snake_case, as Postgres returns it).
type ConversationRow = {
  id: string;
  counterpart_id: string;
  counterpart_business_name: string | null;
  counterpart_first_name: string | null;
  counterpart_avatar_uri: string | null;
  job_context: string;
  listing_price: number | null;
  listing_price_type: PriceType | null;
  last_read_at: string | null;
  created_at: string;
};

// Shape of a row from the `messages` table.
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "offer";
  text: string | null;
  offer_service: string | null;
  offer_price: number | null;
  offer_price_type: JobOffer["priceType"] | null;
  offer_scheduled_at: string | null;
  offer_status: JobOffer["status"] | null;
  edited: boolean;
  deleted: boolean;
  created_at: string;
};

function rowToMessage(row: MessageRow, myId: string): ChatMessage {
  return {
    id: row.id,
    fromMe: row.sender_id === myId,
    time: formatTime(new Date(row.created_at)),
    createdAt: row.created_at,
    kind: row.kind,
    text: row.text ?? undefined,
    offer:
      row.kind === "offer" && row.offer_service != null && row.offer_price != null && row.offer_price_type != null
        ? {
            service: row.offer_service,
            price: row.offer_price,
            priceType: row.offer_price_type,
            scheduledAt: row.offer_scheduled_at ?? "",
            status: row.offer_status ?? "pending",
          }
        : undefined,
    edited: row.edited,
    deleted: row.deleted,
  };
}

type MessagesState = {
  conversations: Conversation[];
  totalUnread: number;
  getConversation: (id: string) => Conversation | undefined;
  ensureConversation: (
    counterpartName: string,
    counterpartAvatar: string,
    jobContext: string,
    counterpartRating?: number,
    counterpartUserId?: string,
    listingPrice?: number,
    listingPriceType?: PriceType
  ) => Promise<string>;
  refreshConversations: () => void;
  syncConversation: (conversationId: string) => void;
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
  const { currentUser } = useAuth();
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

  // Pulls this account's real conversations (my_conversations RPC) + their messages, and merges
  // them into local state alongside whatever local-only mock threads exist (jobs/bookings/groups
  // chats aren't backed by real accounts yet, so they stay session-local).
  const loadConversations = async () => {
    if (!currentUser) return;
    const { data: convRows, error: convError } = await supabase.rpc("my_conversations");
    if (convError) {
      console.error("[my_conversations] fetch failed:", convError.message);
      return;
    }
    const rows = (convRows as ConversationRow[] | null) ?? [];
    if (rows.length === 0) {
      setByRole((prev) => ({ ...prev, [activeRole]: prev[activeRole].filter((c) => !c.remote) }));
      return;
    }
    const { data: msgRows, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", rows.map((r) => r.id))
      .order("created_at", { ascending: true });
    if (msgError) console.error("[messages] fetch failed:", msgError.message);
    const messagesByConv = new Map<string, ChatMessage[]>();
    ((msgRows as MessageRow[] | null) ?? []).forEach((row) => {
      const list = messagesByConv.get(row.conversation_id) ?? [];
      list.push(rowToMessage(row, currentUser.id));
      messagesByConv.set(row.conversation_id, list);
    });
    const fetched: Conversation[] = rows.map((row) => {
      const msgs = messagesByConv.get(row.id) ?? [];
      const readAt = row.last_read_at;
      const unread = msgs.filter((m) => !m.fromMe && (!readAt || (m.createdAt && m.createdAt > readAt))).length;
      return {
        id: row.id,
        counterpartName: row.counterpart_business_name || row.counterpart_first_name || "SideKick user",
        counterpartAvatar: row.counterpart_avatar_uri ?? "",
        counterpartRating: 0,
        jobContext: row.job_context,
        messages: msgs,
        unread,
        reported: false,
        reportReason: null,
        blocked: false,
        remote: { counterpartId: row.counterpart_id },
        listingPrice: row.listing_price ?? undefined,
        listingPriceType: row.listing_price_type ?? undefined,
      };
    });
    setByRole((prev) => ({ ...prev, [activeRole]: [...fetched, ...prev[activeRole].filter((c) => !c.remote)] }));
  };

  // Re-fetch on login/logout/role switch. A worker who's already signed in when a client starts a
  // new chat won't see it until this re-runs — MessagesList also calls refreshConversations() on
  // mount so opening the Messages tab always pulls the latest.
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    } else {
      setByRole((prev) => ({
        worker: prev.worker.filter((c) => !c.remote),
        client: prev.client.filter((c) => !c.remote),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.username]);

  const refreshConversations = () => {
    loadConversations();
  };

  // Re-fetch just one conversation's messages — called when its chat screen opens, so anything
  // the other side sent since our last fetch shows up (no live push yet, just fetch-on-open).
  const syncConversation = (conversationId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv?.remote || !currentUser) return;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("[messages] sync failed:", error.message);
          return;
        }
        if (data) updateMessages(conversationId, () => (data as MessageRow[]).map((row) => rowToMessage(row, currentUser.id)));
      });
  };

  const ensureConversation = async (
    counterpartName: string,
    counterpartAvatar: string,
    jobContext: string,
    counterpartRating = 5,
    counterpartUserId?: string,
    listingPrice?: number,
    listingPriceType?: PriceType
  ): Promise<string> => {
    if (counterpartUserId && currentUser) {
      const existingRemote = conversations.find((c) => c.remote?.counterpartId === counterpartUserId);
      if (existingRemote) return existingRemote.id;

      const { data, error } = await supabase.rpc("start_conversation", {
        target_worker_id: counterpartUserId,
        initial_job_context: jobContext,
        initial_price: listingPrice ?? null,
        initial_price_type: listingPriceType ?? null,
      });
      if (error || !data) {
        console.error("[start_conversation] failed:", error?.message);
      } else {
        const id = data as string;
        const { data: msgRows } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", id)
          .order("created_at", { ascending: true });
        const messages = ((msgRows as MessageRow[] | null) ?? []).map((row) => rowToMessage(row, currentUser.id));
        const conversation: Conversation = {
          id,
          counterpartName,
          counterpartAvatar,
          counterpartRating,
          jobContext,
          messages,
          unread: 0,
          reported: false,
          reportReason: null,
          blocked: false,
          remote: { counterpartId: counterpartUserId },
          listingPrice,
          listingPriceType,
        };
        setByRole((prev) => ({ ...prev, [activeRole]: [conversation, ...prev[activeRole].filter((c) => c.id !== id)] }));
        return id;
      }
    }

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

  const markConversationRead = (conversationId: string) => {
    updateConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv?.remote) {
      supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId }).then(({ error }) => {
        if (error) console.error("[mark_conversation_read] failed:", error.message);
      });
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  // Optimistic + fire-and-forget for remote conversations: local state updates immediately, the
  // Supabase write happens in the background under the same id.
  const sendMessage = (conversationId: string, text: string): SendResult => {
    const { text: clean, redacted } = sanitizeMessage(text);
    const conv = conversations.find((c) => c.id === conversationId);
    const id = generateId();
    const message: ChatMessage = { id, fromMe: true, kind: "text", text: clean, time: formatTime(new Date()) };
    updateMessages(conversationId, (messages) => [...messages, message]);
    if (conv?.remote && currentUser) {
      supabase
        .from("messages")
        .insert({ id, conversation_id: conversationId, sender_id: currentUser.id, kind: "text", text: clean })
        .then(({ error }) => {
          if (error) console.error("[messages] insert failed:", error.message);
        });
    }
    return { redacted };
  };

  const editMessage = (conversationId: string, messageId: string, text: string): SendResult => {
    const { text: clean, redacted } = sanitizeMessage(text);
    const conv = conversations.find((c) => c.id === conversationId);
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, text: clean, edited: true } : m))
    );
    if (conv?.remote) {
      supabase
        .from("messages")
        .update({ text: clean, edited: true })
        .eq("id", messageId)
        .then(({ error }) => {
          if (error) console.error("[messages] update failed:", error.message);
        });
    }
    return { redacted };
  };

  const deleteMessage = (conversationId: string, messageId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId ? { ...m, deleted: true } : m))
    );
    if (conv?.remote) {
      supabase
        .from("messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .then(({ error }) => {
          if (error) console.error("[messages] delete failed:", error.message);
        });
    }
  };

  const sendOffer = (conversationId: string, offer: Omit<JobOffer, "status">) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const id = generateId();
    const message: ChatMessage = {
      id,
      fromMe: true,
      kind: "offer",
      time: formatTime(new Date()),
      offer: { ...offer, status: "pending" },
    };
    updateMessages(conversationId, (messages) => [...messages, message]);
    if (conv?.remote && currentUser) {
      supabase
        .from("messages")
        .insert({
          id,
          conversation_id: conversationId,
          sender_id: currentUser.id,
          kind: "offer",
          offer_service: offer.service,
          offer_price: offer.price,
          offer_price_type: offer.priceType,
          offer_scheduled_at: offer.scheduledAt,
          offer_status: "pending",
        })
        .then(({ error }) => {
          if (error) console.error("[messages] offer insert failed:", error.message);
        });
    }
  };

  const setOfferStatus = (conversationId: string, messageId: string, status: JobOffer["status"]) => {
    const conv = conversations.find((c) => c.id === conversationId);
    updateMessages(conversationId, (messages) =>
      messages.map((m) => (m.id === messageId && m.offer ? { ...m, offer: { ...m.offer, status } } : m))
    );
    if (conv?.remote) {
      supabase
        .from("messages")
        .update({ offer_status: status })
        .eq("id", messageId)
        .then(({ error }) => {
          if (error) console.error("[messages] offer status update failed:", error.message);
        });
    }
  };

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
        refreshConversations,
        syncConversation,
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
