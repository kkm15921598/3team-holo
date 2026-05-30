// 알림설정 상태를 공유하는 모듈 레벨 store
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncSettingsToSupabase(settings: NotificationSettings, readIds: Set<string>) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({
    notification_settings: settings,
    notification_read_ids: [...readIds],
  }).eq("phone", userPhone).then(({ error }) => {
    if (error) console.warn("Supabase 알림설정 저장 실패:", error.message);
  });
}

// NotificationsScreen ↔ NotificationPanel ↔ AppHeader 모두 사용.
//
// 영속화:
// localStorage 에 저장되어 새로고침/재로그인에도 사용자가 켜/끈 설정이 유지된다.
// 또한 notifications-store 의 push* 함수가 이 설정을 보고 알림 생성 자체를 게이트하므로,
// 사용자가 OFF 한 종류의 알림은 패널에서 필터링되는 게 아니라 애초에 발행되지 않는다.

export type NotificationSettings = {
  master: boolean;
  comment: boolean;
  like: boolean;
  friend: boolean;
  chat: boolean;
  meeting: boolean;
  event: boolean;
  marketing: boolean;
  /** 방해 금지 모드 ON/OFF — 시간 범위는 quiet-hours-store 가 관리 */
  quietEnabled: boolean;
};

const SETTINGS_KEY = "holo.notif.settings.v1";
const READ_KEY = "holo.notif.read.v1";

const DEFAULT_SETTINGS: NotificationSettings = {
  master: true,
  comment: true,
  like: true,
  friend: true,
  chat: true,
  meeting: true,
  event: false,
  marketing: false,
  quietEnabled: false,
};

function loadSettings(): NotificationSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set<string>(arr);
  } catch {
    // ignore
  }
  return new Set();
}

let _state: NotificationSettings = loadSettings();
let _readIds: Set<string> = loadReadIds();
const listeners = new Set<() => void>();

function persistSettings() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(_state));
  } catch {
    // ignore quota
  }
}

function persistReadIds() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([..._readIds]));
  } catch {
    // ignore quota
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function getNotificationSettings(): NotificationSettings {
  return _state;
}

export function setNotificationSettings(next: Partial<NotificationSettings>) {
  _state = { ..._state, ...next };
  persistSettings();
  notify();
  syncSettingsToSupabase(_state, _readIds);
}

export function subscribeNotificationSettings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * 계정 전환/신규가입 시 알림설정·읽음목록을 기본값으로 초기화(로컬 전용, Supabase 미반영).
 * 로그인 플로우가 sync 전에 호출 → reset(기본값) → sync(원격 있으면 덮어쓰기, 없으면 기본값 유지)
 * 순서로 이전 계정 설정 누설을 막는다. (sync 가 빈/누락 원격값은 건너뛰므로 reset 이 없으면 누설됨)
 * 조기 반환 없이 무조건 기본값으로 되돌려야 하며, Supabase 쓰기는 호출하지 않는다.
 */
export function resetNotificationSettings(): void {
  _state = { ...DEFAULT_SETTINGS };
  _readIds = new Set();
  persistSettings();
  persistReadIds();
  notify();
}

// 읽음 상태 관련
export function getReadIds(): Set<string> {
  return _readIds;
}

export function markRead(id: string) {
  _readIds = new Set(_readIds).add(id);
  persistReadIds();
  notify();
  syncSettingsToSupabase(_state, _readIds);
}

export function markAllRead(ids: string[]) {
  // 기존 읽음 + 새로 들어온 ID 들의 합집합
  const merged = new Set(_readIds);
  for (const id of ids) merged.add(id);
  _readIds = merged;
  persistReadIds();
  notify();
  syncSettingsToSupabase(_state, _readIds);
}

/**
 * 로그인 후 Supabase users 테이블에서 알림 설정과 읽음 목록을 읽어
 * 로컬 상태를 덮어쓴다. 다른 기기에서 변경한 알림 설정이 반영된다.
 */
export async function syncNotificationSettingsFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("users")
    .select("notification_settings, notification_read_ids")
    .eq("phone", userPhone)
    .maybeSingle();

  if (error) {
    console.warn("Supabase 알림설정 읽기 실패:", error.message);
    return;
  }
  if (!data) return;

  if (data.notification_settings && typeof data.notification_settings === "object") {
    _state = { ...DEFAULT_SETTINGS, ...(data.notification_settings as Partial<NotificationSettings>) };
    persistSettings();
  }

  if (Array.isArray(data.notification_read_ids) && (data.notification_read_ids as unknown[]).length > 0) {
    _readIds = new Set<string>(data.notification_read_ids as string[]);
    persistReadIds();
  }

  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncNotificationSettingsFromSupabase(), 800);
  });
}
