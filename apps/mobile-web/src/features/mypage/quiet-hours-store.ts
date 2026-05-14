// Module-level store for quiet-hours settings.
// Shared between NotificationsScreen and QuietHoursScreen.

export type QuietHours = {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
};

let _state: QuietHours = { startH: 22, startM: 0, endH: 8, endM: 0 };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getQuietHours(): QuietHours {
  return _state;
}

export function setQuietHours(next: QuietHours) {
  _state = next;
  notify();
}

export function subscribeQuietHours(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
