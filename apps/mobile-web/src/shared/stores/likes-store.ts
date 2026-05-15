import { useSyncExternalStore } from "react";

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
  if (next.has(id)) next.delete(id);
  else next.add(id);
  state = next;
  persist();
  emit();
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
