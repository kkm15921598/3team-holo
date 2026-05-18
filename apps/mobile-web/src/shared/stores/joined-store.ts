import { useSyncExternalStore } from "react";

/**
 * 모임 참여 상태 store.
 *
 * - 게시글 상세에서 "함께하기" 버튼을 누르면 해당 post.id 가 set 에 추가된다.
 * - "모임 참여중" 상태에서 다시 한 번 누르면 leavePost 로 참여가 취소된다 — 채팅방 퇴장은 호출 측에서 처리.
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
 */
export function joinPost(id: string): void {
  if (state.has(id)) return;
  const next = new Set(state);
  next.add(id);
  state = next;
  persist();
  emit();
}

/**
 * 참여 취소 — "모임 참여중" 상태에서 다시 한 번 클릭했을 때 사용.
 * 참여 중이 아니면 no-op. 채팅방 퇴장은 호출 측에서 별도로 수행한다.
 */
export function leavePost(id: string): void {
  if (!state.has(id)) return;
  const next = new Set(state);
  next.delete(id);
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
