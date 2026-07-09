import { ScrollView, View } from "react-native";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { ToggleRow } from "../../src/components/ToggleRow";
import { useClientData } from "../../src/context/ClientDataContext";

export default function ClientNotifications() {
  const { notificationPrefs, updateNotificationPrefs } = useClientData();

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <ToggleRow
          icon="briefcase-outline"
          label="Booking updates"
          description="When a worker accepts, starts, or finishes a job"
          value={notificationPrefs.bookingUpdates}
          onValueChange={(bookingUpdates) => updateNotificationPrefs({ bookingUpdates })}
        />
        <ToggleRow
          icon="chatbubble-outline"
          label="Messages"
          description="New messages from workers"
          value={notificationPrefs.messages}
          onValueChange={(messages) => updateNotificationPrefs({ messages })}
        />
        <ToggleRow
          icon="megaphone-outline"
          label="Promos & recommendations"
          description="Occasional suggestions for local help"
          value={notificationPrefs.promos}
          onValueChange={(promos) => updateNotificationPrefs({ promos })}
        />
      </ScrollView>
    </View>
  );
}
