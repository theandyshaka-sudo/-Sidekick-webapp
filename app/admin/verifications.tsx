import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminHeader } from "../../src/components/AdminHeader";
import { Badge } from "../../src/components/Badge";
import { useVerificationQueue } from "../../src/context/VerificationQueueContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useThemeVars } from "../../src/theme/useThemeVars";
import { ageFromDob } from "../../src/data/categoriesConfig";
import type { DocumentType } from "../../src/context/WorkerDataContext";
import type { IdSubmission } from "../../src/data/verificationQueueMock";

const DOC_LABEL: Record<DocumentType, string> = {
  passport: "Passport",
  drivers_license: "Driver's License",
  state_id: "State ID",
};

// The heading printed across the top of the blown-up document.
const DOC_TITLE: Record<DocumentType, string> = {
  passport: "PASSPORT",
  drivers_license: "DRIVER LICENSE",
  state_id: "IDENTIFICATION CARD",
};

function formatDob(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function IdField({ label, value, highlight, palette }: { label: string; value: string; highlight?: boolean; palette: ReturnType<typeof useRolePalette> }) {
  return (
    <View className="mb-2">
      <Text className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: palette.muted }}>{label}</Text>
      <Text className="text-sm font-bold" style={{ color: highlight ? palette.primary : palette.text }}>{value}</Text>
    </View>
  );
}

// Full-screen view of the "actual ID" so the admin can inspect the document before verifying.
function IdInspectModal({
  submission,
  onClose,
  onApprove,
  onReject,
}: {
  submission: IdSubmission | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  if (!submission) return null;
  const age = ageFromDob(submission.dobIso);
  const pending = submission.status === "pending";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/70 px-5" style={themeVars}>
        <View className="rounded-3xl p-5" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-bold text-text">Inspect document</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>

          {/* Blown-up ID document */}
          <View className="overflow-hidden rounded-2xl border-2" style={{ borderColor: palette.primary }}>
            <View className="flex-row items-center justify-between px-4 py-2" style={{ backgroundColor: palette.primary }}>
              <Text className="text-xs font-extrabold tracking-widest" style={{ color: palette.primaryFg }}>
                {submission.state.toUpperCase()}
              </Text>
              <Text className="text-xs font-extrabold tracking-widest" style={{ color: palette.primaryFg }}>
                {DOC_TITLE[submission.documentType]}
              </Text>
            </View>
            <View className="flex-row gap-4 p-4" style={{ backgroundColor: palette.surface }}>
              <View>
                <Image source={{ uri: submission.photoUri }} className="h-32 w-24 rounded-lg" />
                <Text className="mt-1 text-center text-[8px] tracking-widest" style={{ color: palette.muted }}>PHOTO</Text>
              </View>
              <View className="flex-1">
                <IdField label="Name" value={submission.name} palette={palette} />
                <IdField label="Date of birth" value={formatDob(submission.dobIso)} highlight palette={palette} />
                <IdField label="Age" value={`${age} years`} highlight palette={palette} />
                <IdField label="Document no." value={submission.idNumber} palette={palette} />
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 border-t border-border px-4 py-2">
              <Ionicons name="shield-checkmark" size={12} color={palette.primary} />
              <Text className="text-[9px] text-muted">Mock document for demo — no real ID data.</Text>
            </View>
          </View>

          {pending ? (
            <View className="mt-4 flex-row gap-2">
              <Pressable onPress={() => { onReject(submission.id); onClose(); }} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-3 active:opacity-70">
                <Ionicons name="close-circle-outline" size={16} color={palette.danger} />
                <Text className="text-sm font-semibold" style={{ color: palette.danger }}>Reject</Text>
              </Pressable>
              <Pressable onPress={() => { onApprove(submission.id); onClose(); }} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 active:opacity-80" style={{ backgroundColor: palette.success }}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text className="text-sm font-semibold text-white">{submission.submitterRole === "worker" ? `Approve · ${age}` : "Approve identity"}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// A stylized mock ID card the admin inspects before approving.
function IdCard({ submission, onApprove, onReject, onInspect }: { submission: IdSubmission; onApprove: () => void; onReject: () => void; onInspect: () => void }) {
  const palette = useRolePalette();
  const age = ageFromDob(submission.dobIso);
  const pending = submission.status === "pending";

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: palette.primary }}>SideKick ID</Text>
          <Badge label={submission.submitterRole === "worker" ? "Business owner" : "Client"} tone="muted" />
          {submission.isCurrentUser ? <Badge label="You" tone="primary" /> : null}
        </View>
        <Text className="text-xs text-muted">{submission.submittedAt}</Text>
      </View>

      {/* Mock ID card face */}
      <View className="flex-row gap-3 rounded-xl border border-border bg-bg p-3">
        <Pressable onPress={onInspect} className="active:opacity-80">
          <Image source={{ uri: submission.photoUri }} className="h-20 w-16 rounded-lg" />
          <View className="absolute -bottom-1.5 -right-1.5 h-7 w-7 items-center justify-center rounded-full border-2 border-bg" style={{ backgroundColor: palette.primary }}>
            <Ionicons name="search" size={13} color={palette.primaryFg} />
          </View>
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-text">{submission.name}</Text>
          <Text className="mt-0.5 text-xs text-muted">{submission.state} · {DOC_LABEL[submission.documentType]}</Text>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={12} color={palette.muted} />
            <Text className="text-xs text-text">DOB {formatDob(submission.dobIso)}</Text>
            <Text className="text-xs font-semibold" style={{ color: palette.primary }}>· Age {age}</Text>
          </View>
          <Text className="mt-1 text-[10px] tracking-wider text-muted">ID {submission.idNumber}</Text>
        </View>
      </View>

      {pending ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={onReject} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
            <Ionicons name="close-circle-outline" size={16} color={palette.danger} />
            <Text className="text-sm font-semibold" style={{ color: palette.danger }}>Reject</Text>
          </Pressable>
          <Pressable onPress={onApprove} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 active:opacity-80" style={{ backgroundColor: palette.success }}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">{submission.submitterRole === "worker" ? `Approve · ${age}` : "Approve identity"}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-3 flex-row items-center gap-1.5 border-t border-border pt-3">
          <Ionicons
            name={submission.status === "approved" ? "checkmark-circle" : "close-circle"}
            size={15}
            color={submission.status === "approved" ? palette.success : palette.danger}
          />
          <Text className="text-sm font-medium" style={{ color: submission.status === "approved" ? palette.success : palette.danger }}>
            {submission.status === "approved"
              ? submission.submitterRole === "worker"
                ? `Approved · age ${age} verified`
                : "Approved · identity verified"
              : "Rejected"}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AdminVerifications() {
  const palette = useRolePalette();
  const { submissions, approve, reject } = useVerificationQueue();
  const [inspecting, setInspecting] = useState<IdSubmission | null>(null);
  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <View className="flex-1 bg-bg">
      <AdminHeader title="ID review" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 flex-row items-center gap-2 rounded-2xl border border-border bg-surface p-3">
          <Ionicons name="finger-print" size={18} color={palette.primary} />
          <Text className="flex-1 text-xs text-muted">
            Review submitted IDs and confirm the details. Approving verifies a business owner's age or a client's identity.
          </Text>
        </View>

        <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Awaiting review ({pending.length})
        </Text>
        {pending.length === 0 ? (
          <View className="mb-6 items-center rounded-2xl border border-border bg-surface py-8">
            <Ionicons name="checkmark-done" size={26} color={palette.success} />
            <Text className="mt-2 text-sm text-muted">All caught up — no IDs to review.</Text>
          </View>
        ) : (
          <View className="mb-6 gap-3">
            {pending.map((s) => (
              <IdCard key={s.id} submission={s} onApprove={() => approve(s.id)} onReject={() => reject(s.id)} onInspect={() => setInspecting(s)} />
            ))}
          </View>
        )}

        {reviewed.length > 0 ? (
          <>
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Reviewed</Text>
            <View className="gap-3">
              {reviewed.map((s) => (
                <IdCard key={s.id} submission={s} onApprove={() => approve(s.id)} onReject={() => reject(s.id)} onInspect={() => setInspecting(s)} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <IdInspectModal
        submission={inspecting}
        onClose={() => setInspecting(null)}
        onApprove={approve}
        onReject={reject}
      />
    </View>
  );
}
