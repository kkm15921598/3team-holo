import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(s: Set<string>) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ reported_nicknames: [...s] })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 신고 저장 실패:", error.message);
    });
}

/**
 * 사용자가 "신고하기" 로 처리한 닉네임을 영속화하는 store.
 *
 * - 친구 페이지 / 프로필 상세 등에서 사용자를 신고하면 닉네임이 이 set 에 들어간다.
 * - 신고된 사용자는 이웃 추천 등 노출 후보에서 제외하는 데 사용.
 * - mock 환경이라 실제 신고 처리 백엔드는 없고, "내가 신고했으니 더 보지 않는다" 정도의
 *   사용자 경험만 유지하기 위한 클라이언트 단 기록.
 */

const STORAGE_KEY = "holo:reported-users:v1";

function loadInitial(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set<string>(parsed);
    }
  } catch {
    // ignore
  }
  return new Set();
}

let state: Set<string> = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...state]));
  } catch {
    // ignore
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** 닉네임이 이미 신고된 적 있는지 — 화면 단위 가드용. */
export function isReported(nickname: string): boolean {
  return state.has(nickname);
}

/** 신고 기록 — 이미 신고된 닉네임이면 no-op. */
export function markReported(nickname: string): void {
  const trimmed = nickname.trim();
  if (!trimmed || state.has(trimmed)) return;
  const next = new Set(state);
  next.add(trimmed);
  state = next;
  persist();
  emit();
  syncToSupabase(state);
}

/** 신고 기록 전체 — 노출 후보 필터링 등에 사용. */
export function getReportedNicknames(): Set<string> {
  return state;
}

/** 신규 가입 시 신고 기록 초기화. */
export function resetReportedUsers(): void {
  if (state.size === 0) return;
  state = new Set();
  persist();
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => state;

/** React 컴포넌트에서 신고 set 을 라이브로 구독. */
export function useReportedNicknames(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * 로그인 후 Supabase users 테이블에서 신고 목록을 읽어 로컬 상태와 병합.
 * 다른 기기에서 신고한 항목도 이 기기에서 반영된다.
 */
export async function syncReportedUsersFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("users")
    .select("reported_nicknames")
    .eq("phone", userPhone)
    .maybeSingle();

  if (error) {
    console.warn("Supabase 신고 목록 읽기 실패:", error.message);
    return;
  }
  if (!data || !Array.isArray(data.reported_nicknames) || (data.reported_nicknames as unknown[]).length === 0) return;

  const merged = new Set(state);
  for (const n of data.reported_nicknames as string[]) {
    merged.add(n);
  }
  state = merged;
  persist();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncReportedUsersFromSupabase(), 900);
  });
}
