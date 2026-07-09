import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { useMessages } from "../context/MessagesContext";
import { useRolePalette } from "../theme/useRolePalette";

export function MessagesList() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useRolePalette();
  const { conversations } = useMessages();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-1 px-6 text-2xl font-bold text-text">Messages</Text>
      <View className="mb-4 flex-row items-center gap-1.5 px-6">
        <Ionicons name="lock-closed" size={12} color={palette.muted} />
        <Text className="text-xs text-muted">In-app only — phone numbers and emails are hidden</Text>
      </View>

      <View className="px-4">
        {conversations.map((conversation) => {
          const last = conversation.messages[conversation.messages.length - 1];
          return (
            <Pressable
              key={conversation.id}
              onPress={() => router.push(`/chat/${conversation.id}`)}
              className="flex-row items-center gap-3 rounded-2xl px-2 py-3 active:opacity-70"
            >
              <View>
                <Avatar uri={conversation.counterpartAvatar} name={conversation.counterpartName} size={52} />
                {conversation.unread > 0 ? (
                  <View
                    className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full px-1"
                    style={{ backgroundColor: palette.primary }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: palette.primaryFg }}>{conversation.unread}</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-1 border-b border-border pb-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-base ${conversation.unread > 0 ? "font-bold" : "font-semibold"} text-text`}
                    numberOfLines={1}
                  >
                    {conversation.counterpartName}
                  </Text>
                  <Text className="text-xs text-muted">{last?.time}</Text>
                </View>
                <Text
                  className={`mt-0.5 text-xs ${conversation.unread > 0 ? "text-text" : "text-muted"}`}
                  numberOfLines={1}
                >
                  {last?.fromMe ? "You: " : ""}
                  {last?.kind === "offer" ? "Job offer" : last?.deleted ? "Message deleted" : last?.text}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: palette.primary }} numberOfLines={1}>
                  {conversation.jobContext}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {conversations.length === 0 ? (
          <EmptyState icon="chatbubbles-outline" title="No messages yet" subtitle="Your conversations with clients will appear here." />
        ) : null}
      </View>
    </ScrollView>
  );
}
