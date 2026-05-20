import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(s: Set<string>) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ blocked_nicknames: [...s] })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 차단 저장 실패:", error.message);
    });
}

/**
 * 친구가 아닌 사용자(예: 게시글 작성자 / 채팅 상대 등) 를 차단했을 때 닉네임을 영속화하는 store.
 *
 * - 친구로 등록된 사람을 차단할 때는 friends-store 의 _blocked 리스트가 따로 관리한다 (Friend 객체 보존).
 * - 이 store 는 "닉네임만 있는" 가벼운 차단 기록 — 프로필 상세에서 비친구를 차단했을 때, 또는
 *   이웃 추천 등 노출 후보 필터링에 쓸 단일 출처.
 * - friends-screen 의 친구 차단 호출에서도 이 store 에 동시 push 하면 검색 / 추천 어디서나
 *   "차단된 닉네임" 집합을 한 번에 가져올 수 있다.
 */

const STORAGE_KEY = "holo:blocked-nicknames:v1";

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

export function isBlocked(nickname: string): boolean {
  return state.has(nickname);
}

export function markBlocked(nickname: string): void {
  const trimmed = nickname.trim();
  if (!trimmed || state.has(trimmed)) return;
  const next = new Set(state);
  next.add(trimmed);
  state = next;
  persist();
  emit();
  syncToSupabase(state);
}

export function unmarkBlocked(nickname: string): void {
  const trimmed = nickname.trim();
  if (!state.has(trimmed)) return;
  const next = new Set(state);
  next.delete(trimmed);
  state = next;
  persist();
  emit();
  syncToSupabase(state);
}

export function getBlockedNicknames(): Set<string> {
  return state;
}

export function resetBlockedNicknames(): void {
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

export function useBlockedNicknames(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Supabase users.blocked_nicknames 에서 차단 목록 읽어와 병합.
 */
export async function syncBlockedFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("blocked_nicknames")
    .eq("phone", userPhone)
    .single();
  if (error || !data || !data.blocked_nicknames) return;
  const remote = data.blocked_nicknames as string[];
  state = new Set([...state, ...remote]);
  persist();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncBlockedFromSupabase(), 750);
  });
}
