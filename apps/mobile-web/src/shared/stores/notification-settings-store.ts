// 알림설정 상태를 공유하는 모듈 레벨 store
// NotificationsScreen ↔ NotificationPanel ↔ AppHeader 모두 사용

export type NotificationSettings = {
  master: boolean;
  comment: boolean;
  like: boolean;
  friend: boolean;
  chat: boolean;
  meeting: boolean;
  event: boolean;
  marketing: boolean;
};

let _state: NotificationSettings = {
  master: true,
  comment: true,
  like: true,
  friend: true,
  chat: true,
  meeting: true,
  event: false,
  marketing: false,
};

// 읽음 처리된 알림 ID 집합
let _readIds: Set<string> = new Set();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getNotificationSettings(): NotificationSettings {
  return _state;
}

export function setNotificationSettings(next: Partial<NotificationSettings>) {
  _state = { ..._state, ...next };
  notify();
}

export function subscribeNotificationSettings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 읽음 상태 관련
export function getReadIds(): Set<string> {
  return _readIds;
}

export function markRead(id: string) {
  _readIds = new Set(_readIds).add(id);
  notify();
}

export function markAllRead(ids: string[]) {
  _readIds = new Set(ids);
  notify();
}
