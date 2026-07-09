import { ScrollView, View } from "react-native";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { ToggleRow } from "../../src/components/ToggleRow";
import { useWorkerData } from "../../src/context/WorkerDataContext";

export default function WorkerNotifications() {
  const { notificationPrefs, updateNotificationPrefs } = useWorkerData();

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <ToggleRow
          icon="briefcase-outline"
          label="New job requests"
          description="When a client requests to book you"
          value={notificationPrefs.newRequests}
          onValueChange={(newRequests) => updateNotificationPrefs({ newRequests })}
        />
        <ToggleRow
          icon="chatbubble-outline"
          label="Messages"
          description="New messages from clients"
          value={notificationPrefs.messages}
          onValueChange={(messages) => updateNotificationPrefs({ messages })}
        />
        <ToggleRow
          icon="cash-outline"
          label="Cash payment reminders"
          description="Reminders to confirm cash was collected"
          value={notificationPrefs.cashReminders}
          onValueChange={(cashReminders) => updateNotificationPrefs({ cashReminders })}
        />
        <ToggleRow
          icon="megaphone-outline"
          label="Tips & product updates"
          description="Occasional tips on growing your business"
          value={notificationPrefs.tips}
          onValueChange={(tips) => updateNotificationPrefs({ tips })}
        />
      </ScrollView>
    </View>
  );
}
