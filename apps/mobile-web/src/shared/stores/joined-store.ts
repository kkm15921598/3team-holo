import { useSyncExternalStore } from "react";

/**
 * 모임 참여 상태 store.
 *
 * - 게시글 상세에서 "함께하기" 버튼을 누르면 해당 post.id 가 set 에 추가된다.
 * - 한 번 추가된 id 는 풀지 않는다 — 페이지를 떠났다가 다시 들어와도 "모임 참여중" 상태가 유지.
 * - localStorage 에 영속화되어 새로고침 후에도 유지된다.
 */

const STORAGE_KEY = "holo:joined:v1";

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

/**
 * 참여 추가. 이미 참여 중이면 no-op.
 * 일부러 "취소" API 는 제공하지 않는다 — 한 번 누른 참여중 상태는 풀리지 않아야 한다.
 */
export function joinPost(id: string): void {
  if (state.has(id)) return;
  const next = new Set(state);
  next.add(id);
  state = next;
  persist();
  emit();
}

export function getJoinedIds(): string[] {
  return [...state];
}

/** 참여 set 전체 교체 — 테스트 계정 시드 / 리셋 시 사용 */
export function setJoinedIds(ids: string[]): void {
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

/** 참여한 post.id 의 Set 을 React 컴포넌트에서 구독 */
export function useJoinedSet(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
