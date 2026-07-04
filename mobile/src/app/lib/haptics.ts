import * as Haptics from 'expo-haptics';

export function selection(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function light(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
