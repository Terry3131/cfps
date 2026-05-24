export async function initializePushNotifications() {
  return {
    enabled: false,
    provider: "expo-push-notifications",
    reason: "Polling is active for mobile v1. Push registration is intentionally deferred.",
  };
}

export async function teardownPushNotifications() {
  return true;
}
