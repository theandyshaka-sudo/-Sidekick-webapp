import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/Avatar";
import { WorkerListingCard } from "../../src/components/WorkerListingCard";
import { EmptyState } from "../../src/components/EmptyState";
import { ActionSheet, type ActionSheetOption } from "../../src/components/ActionSheet";
import { VerifyGateModal } from "../../src/components/VerifyGateModal";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useClientData } from "../../src/context/ClientDataContext";
import { useJobs } from "../../src/context/JobsContext";
import { useMessages } from "../../src/context/MessagesContext";
import { useThemeVars } from "../../src/theme/useThemeVars";
import { categories, nearbyWorkers, type NearbyWorker } from "../../src/data/clientMock";
import type { PriceType } from "../../src/data/workerMock";

function LocationModal({
  visible,
  initialZip,
  initialCity,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialZip: string;
  initialCity: string;
  onClose: () => void;
  onSave: (zip: string, city: string) => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const [zip, setZip] = useState(initialZip);
  const [city, setCity] = useState(initialCity);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" style={themeVars} onPress={onClose}>
        <Pressable className="rounded-t-3xl px-5 pb-8 pt-4" style={{ backgroundColor: palette.surface }} onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">Your location</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Zip code</Text>
          <TextInput
            value={zip}
            onChangeText={(t) => setZip(t.replace(/[^0-9]/g, "").slice(0, 5))}
            placeholder="10701"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            style={{ color: palette.text }}
            className="mb-4 rounded-2xl border border-border bg-bg px-4 py-3 text-base"
          />
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">City / neighborhood</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Yonkers"
            placeholderTextColor={palette.muted}
            style={{ color: palette.text }}
            className="mb-5 rounded-2xl border border-border bg-bg px-4 py-3 text-base"
          />
          <Pressable
            onPress={() => {
              if (zip.trim() && city.trim()) onSave(zip.trim(), city.trim());
            }}
            className="items-center rounded-2xl bg-primary py-4 active:opacity-80"
          >
            <Text className="text-base font-semibold text-primary-fg">Save location</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function parsePrice(label: string): { price: number; priceType: PriceType } {
  const price = Number(label.replace(/[^0-9]/g, "")) || 0;
  return { price, priceType: label.includes("/hr") ? "hour" : "job" };
}

type SortKey = "distance" | "rating" | "priceHigh" | "priceLow";
const SORT_LABELS: Record<SortKey, string> = {
  distance: "Closest",
  rating: "Highest rated",
  priceHigh: "Most expensive",
  priceLow: "Least expensive",
};

export default function ClientDiscover() {
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const router = useRouter();
  const { profile, location, updateLocation, verification } = useClientData();
  const { jobs, requestJob } = useJobs();
  const { ensureConversation } = useMessages();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("distance");
  const [sortOpen, setSortOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  const requestedNames = useMemo(
    () => new Set(jobs.filter((j) => j.status !== "declined").map((j) => j.counterpartName)),
    [jobs]
  );

  const priceOf = (w: NearbyWorker) => parsePrice(w.priceLabel).price;
  const filtered = nearbyWorkers
    .filter((worker) => {
      const matchesCategory = !activeCategory || worker.categoryId === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || worker.businessName.toLowerCase().includes(q) || worker.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => {
      switch (sort) {
        case "distance": return a.distanceMiles - b.distanceMiles;
        case "rating": return b.rating - a.rating;
        case "priceHigh": return priceOf(b) - priceOf(a);
        case "priceLow": return priceOf(a) - priceOf(b);
      }
    });

  const sortOptions: ActionSheetOption[] = (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
    label: SORT_LABELS[key],
    icon: sort === key ? "checkmark-circle" : undefined,
    onPress: () => setSort(key),
  }));

  const handleRequest = (worker: NearbyWorker) => {
    // Clients must verify their identity before requesting a booking or messaging (HANDOFF §5).
    if (verification.status !== "verified") {
      setGateOpen(true);
      return;
    }
    const { price, priceType } = parsePrice(worker.priceLabel);
    requestJob({
      service: worker.category,
      counterpartName: worker.name,
      counterpartAvatar: worker.avatarUri,
      price,
      priceType,
    });
    const convId = ensureConversation(worker.name, worker.avatarUri, worker.category, worker.rating);
    router.push(`/chat/${convId}`);
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between px-6">
          <Text className="text-2xl font-bold text-text">Discover</Text>
          <Avatar uri={profile.avatarUri} name={profile.fullName} size={40} />
        </View>

        <View className="mt-4 flex-row gap-2 px-6">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a service or business"
              placeholderTextColor={palette.muted}
              className="flex-1 text-base text-text"
            />
          </View>
          <Pressable
            onPress={() => setLocationOpen(true)}
            className="items-center justify-center rounded-2xl border border-border bg-surface px-3 active:opacity-70"
            style={{ maxWidth: 120 }}
          >
            <Ionicons name="location" size={16} color={palette.primary} />
            <Text className="text-[11px] font-semibold" style={{ color: palette.text }} numberOfLines={1}>{location.city || "Set location"}</Text>
            {location.zip ? <Text className="text-[10px]" style={{ color: palette.muted }}>{location.zip}</Text> : null}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 10, marginTop: 16 }}
        >
          {categories.map((category) => {
            const active = activeCategory === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setActiveCategory(active ? null : category.id)}
                className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2"
                style={{
                  borderColor: active ? palette.primary : palette.border,
                  backgroundColor: active ? palette.primarySoft : palette.surface,
                }}
              >
                <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={14} color={active ? palette.primary : palette.muted} />
                <Text className="text-xs font-medium" style={{ color: active ? palette.primary : palette.text }}>
                  {category.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="mt-6 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">
              {filtered.length} near {location.city || "you"}
            </Text>
            <Pressable
              onPress={() => setSortOpen(true)}
              className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 active:opacity-70"
            >
              <Ionicons name="swap-vertical" size={13} color={palette.primary} />
              <Text className="text-xs font-semibold" style={{ color: palette.text }}>{SORT_LABELS[sort]}</Text>
              <Ionicons name="chevron-down" size={13} color={palette.muted} />
            </Pressable>
          </View>
          <View className="gap-3">
            {filtered.map((worker) => (
              <WorkerListingCard
                key={worker.id}
                worker={worker}
                requested={requestedNames.has(worker.name)}
                onRequest={() => handleRequest(worker)}
                onOpen={() => router.push(`/provider/${worker.id}`)}
              />
            ))}
            {filtered.length === 0 ? (
              nearbyWorkers.length === 0 ? (
                <EmptyState
                  icon="storefront-outline"
                  title="No business owners nearby yet"
                  subtitle="SideKick is just getting started in your area — check back soon."
                />
              ) : (
                <Text className="text-sm text-muted">No matches — try a different search or category.</Text>
              )
            ) : null}
          </View>
        </View>
      </ScrollView>

      <LocationModal
        visible={locationOpen}
        initialZip={location.zip}
        initialCity={location.city}
        onClose={() => setLocationOpen(false)}
        onSave={(zip, city) => {
          updateLocation({ zip, city });
          setLocationOpen(false);
        }}
      />

      <ActionSheet
        visible={sortOpen}
        title="Sort by"
        options={sortOptions}
        onClose={() => setSortOpen(false)}
      />

      <VerifyGateModal
        visible={gateOpen}
        role="client"
        action="request a booking or message a business owner"
        onVerify={() => { setGateOpen(false); router.push("/onboarding/verify"); }}
        onClose={() => setGateOpen(false)}
      />
    </View>
  );
}
