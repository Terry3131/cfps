import { Audio } from "expo-av";

let soundObject = null;
let alertIntervalId = null;
let alertNotificationIds = new Set();

export async function playAlertSound() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      staysActiveInBackground: false,
    });

    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3" },
      { shouldPlay: true, volume: 1.0 }
    );

    soundObject = sound;

    setTimeout(async () => {
      try {
        if (soundObject) {
          await soundObject.stopAsync();
          await soundObject.unloadAsync();
          soundObject = null;
        }
      } catch {}
    }, 15000);
  } catch (err) {
    console.log("[alertSound] playAlertSound error:", err.message);
  }
}

export function startAlertInterval(notificationIds) {
  stopAlertInterval();
  alertNotificationIds = new Set(notificationIds);

  playAlertSound();

  alertIntervalId = setInterval(() => {
    if (alertNotificationIds.size > 0) {
      playAlertSound();
    } else {
      stopAlertInterval();
    }
  }, 60 * 60 * 1000);
}

export function stopAlertInterval() {
  if (alertIntervalId) {
    clearInterval(alertIntervalId);
    alertIntervalId = null;
  }
}

export function removeAlertNotificationId(id) {
  alertNotificationIds.delete(String(id));
  if (alertNotificationIds.size === 0) {
    stopAlertInterval();
  }
}

export function updateAlertNotificationIds(ids) {
  alertNotificationIds = new Set(ids.map(String));
  if (alertNotificationIds.size === 0) {
    stopAlertInterval();
  }
}