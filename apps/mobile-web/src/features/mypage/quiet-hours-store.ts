// 방해 금지 모드의 시작·종료 시각을 영속화하는 store.
// NotificationsScreen ↔ QuietHoursScreen 공유.
// 토글 자체(ON/OFF)는 notification-settings-store 의 quietEnabled 로 관리.
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(s: QuietHours) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ quiet_hours: s })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 방해금지 시각 저장 실패:", error.message);
    });
}

export type QuietHours = {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
};

const STORAGE_KEY = "holo.notif.quiet-hours.v1";

const DEFAULT_STATE: QuietHours = { startH: 22, startM: 0, endH: 8, endM: 0 };

function load(): QuietHours {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<QuietHours>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let _state: QuietHours = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // ignore quota
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function getQuietHours(): QuietHours {
  return _state;
}

export function setQuietHours(next: QuietHours) {
  _state = next;
  persist();
  notify();
  syncToSupabase(_state);
}

export function subscribeQuietHours(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 계정 전환/신규가입 시 기본값으로 초기화(로컬 전용, Supabase 미반영). */
export function resetQuietHours(): void {
  _state = { ...DEFAULT_STATE };
  persist();
  notify();
}

/**
 * 로그인 후 Supabase users.quiet_hours 를 읽어 로컬 상태 복원.
 * (이전엔 쓰기만 있고 읽기가 없어, 계정 전환 시 이전 계정 시간대가 누설되고
 *  타기기/재로그인 시 본인 설정이 복원되지 않았다.)
 */
export async function syncQuietHoursFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("quiet_hours")
    .eq("phone", userPhone)
    .maybeSingle();
  if (error || !data?.quiet_hours || typeof data.quiet_hours !== "object") return;
  _state = { ...DEFAULT_STATE, ...(data.quiet_hours as Partial<QuietHours>) };
  persist();
  notify();
}

/**
 * 현재 시각이 방해 금지 시간대 안인지 판정.
 * 시작 시각이 종료 시각보다 늦으면 (예: 22:00 ~ 08:00) 자정을 가로지르는 범위로 본다.
 */
export function isInQuietHoursNow(now: Date = new Date()): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = _state.startH * 60 + _state.startM;
  const end = _state.endH * 60 + _state.endM;
  if (start === end) return false;
  if (start < end) return cur >= start && cur < end;
  // 자정 가로지름 — 22:00 ~ 08:00 같은 케이스
  return cur >= start || cur < end;
}
