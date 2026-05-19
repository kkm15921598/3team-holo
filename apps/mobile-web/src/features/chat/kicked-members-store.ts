// 채팅방 퇴장 투표 결과로 강퇴된 닉네임을 게시글(roomId↔postId) 단위로 보관.
// - 채팅방에서는 buildMembersFor 에서 이 set 의 닉네임을 필터링.
// - 게시글 인원수에서는 calcJoined 가 이 set 의 크기만큼 baseJoined 를 차감.

import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(m: KickedMap) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ kicked_members: m })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 강퇴목록 저장 실패:", error.message);
    });
}

const STORAGE_KEY = "holo:kickedMembers:v1";

/** postId → 강퇴된 닉네임 배열 */
type KickedMap = Record<string, string[]>;

function loadInitial(): KickedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as KickedMap;
    }
  } catch {
    // ignore
  }
  return {};
}

let state: KickedMap = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** 강퇴 추가 — 중복 없는 set 으로 관리. 새로 추가됐으면 true. */
export function addKickedMember(postId: string, nickname: string): boolean {
  const cur = state[postId] ?? [];
  if (cur.includes(nickname)) return false;
  state = { ...state, [postId]: [...cur, nickname] };
  persist();
  emit();
  syncToSupabase(state);
  return true;
}

/** 특정 게시글에서 강퇴된 닉네임 목록 */
export function getKickedMembers(postId: string): string[] {
  return state[postId] ?? [];
}

/** 강퇴된 인원 수 — calcJoined 차감용 */
export function getKickedCount(postId: string): number {
  return (state[postId] ?? []).length;
}

/** 신규 가입 / 리셋 시 모든 강퇴 기록 비우기 */
export function resetKickedMembers(): void {
  state = {};
  persist();
  emit();
  syncToSupabase(state);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => state;

export function useKickedMap(): KickedMap {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
