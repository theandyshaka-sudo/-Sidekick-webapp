import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/Avatar";
import { EmptyState } from "../../src/components/EmptyState";
import { useGroups } from "../../src/context/GroupsContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import type { Group } from "../../src/data/groupsMock";

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  const palette = useRolePalette();
  const last = group.messages.filter((m) => !m.deleted).slice(-1)[0];
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 active:opacity-80">
      <Avatar uri={group.avatarUri} name={group.name} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="flex-1 text-sm font-bold text-text" numberOfLines={1}>{group.name}</Text>
          {group.isPrivate ? <Ionicons name="lock-closed" size={12} color={palette.muted} /> : null}
        </View>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {last ? `${last.senderName}: ${last.text}` : group.description}
        </Text>
        <Text className="mt-0.5 text-[11px] text-muted">{group.members.length} member{group.members.length === 1 ? "" : "s"}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </Pressable>
  );
}

function DiscoverRow({ group, onOpen, onJoin, onUpgrade, requested, atLimit }: { group: Group; onOpen: () => void; onJoin: () => void; onUpgrade: () => void; requested: boolean; atLimit: boolean }) {
  const palette = useRolePalette();
  const label = requested ? "Requested" : atLimit ? "Upgrade" : group.isPrivate ? "Request" : "Join";
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <Pressable onPress={onOpen} className="flex-1 flex-row items-center gap-3 active:opacity-80">
        <Avatar uri={group.avatarUri} name={group.name} size={48} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-1 text-sm font-bold text-text" numberOfLines={1}>{group.name}</Text>
            {group.isPrivate ? <Ionicons name="lock-closed" size={12} color={palette.muted} /> : null}
          </View>
          <Text className="text-xs text-muted" numberOfLines={2}>{group.description}</Text>
          <Text className="mt-0.5 text-[11px] text-muted">{group.members.length} member{group.members.length === 1 ? "" : "s"}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={requested ? undefined : atLimit ? onUpgrade : onJoin}
        disabled={requested}
        className="rounded-full px-3.5 py-2 active:opacity-80"
        style={{ backgroundColor: requested ? palette.border : atLimit ? palette.primarySoft : palette.primary }}
      >
        <Text className="text-xs font-bold" style={{ color: requested ? palette.muted : atLimit ? palette.primary : palette.primaryFg }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

export default function WorkerGroups() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useRolePalette();
  const { myGroups, discoverGroups, joinGroup, requestJoin, hasRequested, atJoinLimit, joinLimit, joinedCount } = useGroups();

  const open = (id: string) => router.push(`/groups/${id}`);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-text">Groups</Text>
          <Pressable
            onPress={() => router.push("/groups/create")}
            className="h-9 flex-row items-center gap-1 rounded-full px-3 active:opacity-80"
            style={{ backgroundColor: palette.primary }}
          >
            <Ionicons name="add" size={16} color={palette.primaryFg} />
            <Text className="text-sm font-semibold" style={{ color: palette.primaryFg }}>Create</Text>
          </Pressable>
        </View>

        <Text className="mb-1 text-xs leading-5 text-muted">
          Join communities to learn techniques and grow your business with other owners.
        </Text>

        <Text className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-muted">Your groups</Text>
        {myGroups.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-border p-6">
            <Text className="text-center text-sm text-muted">You haven't joined any groups yet. Join one below or create your own.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {myGroups.map((g) => (
              <GroupRow key={g.id} group={g} onPress={() => open(g.id)} />
            ))}
          </View>
        )}

        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted">Discover</Text>
          {joinLimit !== "unlimited" ? (
            <Text className="text-xs text-muted">Joined {joinedCount}/{joinLimit}</Text>
          ) : null}
        </View>
        {atJoinLimit ? (
          <Pressable onPress={() => router.push("/plans")} className="mb-3 flex-row items-center gap-2 rounded-2xl border px-4 py-3 active:opacity-80" style={{ borderColor: palette.primary, backgroundColor: palette.primarySoft }}>
            <Ionicons name="ribbon-outline" size={16} color={palette.primary} />
            <Text className="flex-1 text-xs text-text">You've joined the max for your plan. Upgrade to join more groups.</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.primary} />
          </Pressable>
        ) : null}
        {discoverGroups.length === 0 ? (
          <EmptyState icon="people-outline" title="Nothing to discover yet" subtitle="New groups will show up here as the community grows." />
        ) : (
          <View className="gap-3">
            {discoverGroups.map((grp) => (
              <DiscoverRow
                key={grp.id}
                group={grp}
                requested={hasRequested(grp)}
                atLimit={atJoinLimit}
                onOpen={() => open(grp.id)}
                onJoin={() => (grp.isPrivate ? requestJoin(grp.id) : joinGroup(grp.id))}
                onUpgrade={() => router.push("/plans")}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
