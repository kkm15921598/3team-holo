import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/**
 * 게시글 좋아요 상태 store.
 *
 * - 사용자가 board-detail 의 하트 버튼을 누르면 해당 post.id 가 set 에 들어간다.
 * - localStorage 에 영속화되어 다시 열어도 상태가 유지된다.
 * - mypage 의 "좋아요" 목록 화면도 같은 store 를 구독한다.
 */

const STORAGE_KEY = "holo:likes:v1";

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

export function isPostLiked(id: string): boolean {
  return state.has(id);
}

export function togglePostLike(id: string): boolean {
  const next = new Set(state);
  const wasLiked = next.has(id);
  if (wasLiked) next.delete(id);
  else next.add(id);
  state = next;
  persist();
  emit();

  // Supabase 저장/삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    if (!wasLiked) {
      // 좋아요 추가
      supabase.from("post_likes").insert({
        post_id: id,
        user_id: userPhone,
      }).then(({ error }) => {
        if (error) console.warn("Supabase 좋아요 저장 실패:", error.message);
      });
    } else {
      // 좋아요 취소
      supabase.from("post_likes").delete()
        .eq("post_id", id)
        .eq("user_id", userPhone)
        .then(({ error }) => {
          if (error) console.warn("Supabase 좋아요 삭제 실패:", error.message);
        });
    }
  }

  return state.has(id);
}

export function setPostLiked(id: string, liked: boolean): void {
  const has = state.has(id);
  if (has === liked) return;
  const next = new Set(state);
  if (liked) next.add(id);
  else next.delete(id);
  state = next;
  persist();
  emit();
}

export function getLikedIds(): string[] {
  return [...state];
}

/** 좋아요 set 전체 교체 — 테스트 계정 시드 / 리셋 시 사용 */
export function setLikedIds(ids: string[]): void {
  state = new Set(ids);
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

/** 좋아요 누른 post.id 의 Set 을 React 컴포넌트에서 구독 */
export function useLikedSet(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
