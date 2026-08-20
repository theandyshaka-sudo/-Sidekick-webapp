import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { ToggleRow } from "../../src/components/ToggleRow";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useAuth } from "../../src/context/AuthContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useThemeVars } from "../../src/theme/useThemeVars";

function EditModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function EditUsernameRow() {
  const { currentUser, updateUsername } = useAuth();
  const palette = useRolePalette();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUser?.username ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setValue(currentUser?.username ?? "");
    setError(undefined);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const result = await updateUsername(value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={openModal}
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 active:opacity-70"
      >
        <Ionicons name="person-outline" size={18} color={palette.text} />
        <View className="flex-1">
          <Text className="text-xs text-muted">Username</Text>
          <Text className="text-sm font-medium text-text">{currentUser?.username}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </Pressable>
      {open ? (
        <EditModal title="Change username" onClose={() => setOpen(false)}>
          <FormField
            label="Username"
            value={value}
            onChangeText={(t) => { setValue(t); setError(undefined); }}
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
          />
          <PrimaryButton label="Save" onPress={save} loading={saving} />
        </EditModal>
      ) : null}
    </>
  );
}

function EditEmailRow() {
  const { currentUser, updateEmail } = useAuth();
  const palette = useRolePalette();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUser?.email ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const openModal = () => {
    setValue(currentUser?.email ?? "");
    setError(undefined);
    setSent(false);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const result = await updateEmail(value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <>
      <Pressable
        onPress={openModal}
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 active:opacity-70"
      >
        <Ionicons name="mail-outline" size={18} color={palette.text} />
        <View className="flex-1">
          <Text className="text-xs text-muted">Email</Text>
          <Text className="text-sm font-medium text-text">{currentUser?.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </Pressable>
      {open ? (
        <EditModal title="Change email" onClose={() => setOpen(false)}>
          {sent ? (
            <>
              <Text className="mb-5 text-sm leading-6 text-muted">
                Check both your old and new inbox for a confirmation link — the change takes effect
                once you confirm it.
              </Text>
              <PrimaryButton label="Done" onPress={() => setOpen(false)} />
            </>
          ) : (
            <>
              <FormField
                label="Email"
                value={value}
                onChangeText={(t) => { setValue(t); setError(undefined); }}
                autoCapitalize="none"
                keyboardType="email-address"
                error={error}
              />
              <PrimaryButton label="Save" onPress={save} loading={saving} />
            </>
          )}
        </EditModal>
      ) : null}
    </>
  );
}

function EditPasswordRow() {
  const { updatePassword } = useAuth();
  const palette = useRolePalette();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const openModal = () => {
    setValue("");
    setConfirm("");
    setError(undefined);
    setConfirmError(undefined);
    setDone(false);
    setOpen(true);
  };

  const save = async () => {
    setError(undefined);
    setConfirmError(undefined);
    if (value !== confirm) {
      setConfirmError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const result = await updatePassword(value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  return (
    <>
      <Pressable
        onPress={openModal}
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 active:opacity-70"
      >
        <Ionicons name="key-outline" size={18} color={palette.text} />
        <View className="flex-1">
          <Text className="text-xs text-muted">Password</Text>
          <Text className="text-sm font-medium text-text">••••••••</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </Pressable>
      {open ? (
        <EditModal title="Change password" onClose={() => setOpen(false)}>
          {done ? (
            <>
              <Text className="mb-5 text-sm leading-6 text-muted">Your password has been updated.</Text>
              <PrimaryButton label="Done" onPress={() => setOpen(false)} />
            </>
          ) : (
            <>
              <FormField
                label="New password"
                value={value}
                onChangeText={(t) => { setValue(t); setError(undefined); }}
                secureTextEntry
                autoCapitalize="none"
                error={error}
              />
              <FormField
                label="Confirm new password"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setConfirmError(undefined); }}
                secureTextEntry
                autoCapitalize="none"
                error={confirmError}
              />
              <PrimaryButton label="Save" onPress={save} loading={saving} />
            </>
          )}
        </EditModal>
      ) : null}
    </>
  );
}

export default function Security() {
  const { currentUser, setTwoFactor } = useAuth();
  const palette = useRolePalette();
  const enabled = currentUser?.twoFactorEnabled ?? false;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Security" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Two-step verification
        </Text>
        <ToggleRow
          icon="shield-checkmark-outline"
          label="Two-step verification"
          description={enabled ? "On — we'll email a code at login" : "Off"}
          value={enabled}
          onValueChange={(v) => setTwoFactor(v)}
        />
        <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-border bg-surface p-4">
          <Ionicons name="mail-outline" size={16} color={palette.primary} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            When enabled, each login asks for a one-time code sent to{" "}
            <Text className="font-semibold text-text">{currentUser?.email || "your email"}</Text>.
          </Text>
        </View>

        {currentUser ? (
          <>
            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">Account</Text>
            <View className="gap-2.5">
              <EditUsernameRow />
              <EditEmailRow />
              <EditPasswordRow />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
