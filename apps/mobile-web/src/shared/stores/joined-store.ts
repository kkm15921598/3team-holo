import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { postsStore } from "@/features/board/posts-store";

const AVATAR_BG_POOL = ["#C7BDFF","#FFCFCF","#FCEBB5","#CCBCE0","#DDC0FF","#CAE4B9"];
function userAvatarBg(): string {
  const phone = getCurrentAccount() ?? "default";
  let h = 0;
  for (let i = 0; i < phone.length; i++) h = (Math.imul(31, h) + phone.charCodeAt(i)) | 0;
  return AVATAR_BG_POOL[Math.abs(h) % AVATAR_BG_POOL.length];
}

function syncToSupabase(s: Set<string>) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ joined_post_ids: [...s] })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 모임참여 저장 실패:", error.message);
    });
}

/**
 * 모임 참여 상태 store.
 *
 * - 게시글 상세에서 "함께하기" 버튼을 누르면 해당 post.id 가 set 에 추가된다.
 * - "모임 참여중" 상태에서 다시 한 번 누르면 leavePost 로 참여가 취소된다.
 * - localStorage 에 영속화되어 새로고침 후에도 유지된다.
 */

const STORAGE_KEY = "holo:joined:v2";

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

export function isPostJoined(id: string): boolean {
  return state.has(id);
}

export function joinPost(id: string): void {
  if (state.has(id)) return;
  const next = new Set(state);
  next.add(id);
  state = next;
  persist();
  emit();
  syncToSupabase(state);
  postsStore.patchParticipants(id, userAvatarBg(), "join");
}

export function leavePost(id: string): void {
  if (!state.has(id)) return;
  const next = new Set(state);
  next.delete(id);
  state = next;
  persist();
  emit();
  syncToSupabase(state);
  postsStore.patchParticipants(id, userAvatarBg(), "leave");
}

export function getJoinedIds(): string[] {
  return [...state];
}

export function setJoinedIds(ids: string[]): void {
  state = new Set(ids);
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

export function useJoinedSet(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export async function syncJoinedFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("joined_post_ids")
    .eq("phone", userPhone)
    .single();
  if (error || !data || !data.joined_post_ids) return;
  const remote = data.joined_post_ids as string[];
  state = new Set([...state, ...remote]);
  persist();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncJoinedFromSupabase(), 800);
  });
}
