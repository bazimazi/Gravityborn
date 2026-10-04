import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function vibrate(duration: number): void {
  if (Capacitor.isNativePlatform())
    void Haptics.impact({ style: duration >= 25 ? ImpactStyle.Medium : ImpactStyle.Light }).catch(
      () => {},
    );
  else if (navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      /* No vibration hardware. */
    }
  }
}
export async function installPlatform(
  onSuspend: () => void,
  onBack: () => void,
  onActive: () => void,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Android can pause and resume before onStop emits an inactive app state.
    await App.addListener('pause', onSuspend);
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) onActive();
      else onSuspend();
    });
    await App.addListener('backButton', onBack);
  } else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    // No forced activation: an update waits until older game tabs close.
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      /* Storage may be unavailable. */
    }
  }
}
