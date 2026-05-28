import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initializePushNotifications() {
  try {
    if (!Device.isDevice) {
      return { enabled: false, reason: "Push notifications require a physical device." };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return { enabled: false, reason: "Push notification permission denied." };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("cfps-alerts", {
        name: "CFPS Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
        sound: "notification_sound.wav",
        enableVibrate: true,
        showBadge: true,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "892ad752-496f-4e20-8225-890d72d04716",
    });

    const pushToken = tokenData.data;

    await api.post("/users/push-token", { push_token: pushToken });

    return { enabled: true, token: pushToken };
  } catch (err) {
    console.log("[push] initializePushNotifications error:", err.message);
    return { enabled: false, reason: err.message };
  }
}

export async function teardownPushNotifications() {
  try {
    await api.post("/users/push-token", { push_token: null });
  } catch {}
  return true;
}