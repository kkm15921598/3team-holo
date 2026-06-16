/**
 * 게스트(둘러보기) 모드 store.
 *
 * 로그인하지 않고 앱을 구경할 수 있는 상태. 로그인 화면의 "둘러보기"로 진입한다.
 * - 게스트는 화면을 자유롭게 볼 수 있지만, 글/댓글/좋아요/채팅/마이 편집 등
 *   "쓰기/상호작용" 동작은 막히고 가입 안내 모달이 뜬다(guest-gate 참고).
 * - 실제 로그인 / 회원가입 완료 시 exitGuestMode() 로 해제된다.
 *
 * localStorage 에 플래그만 저장한다(계정 데이터와 무관). 새로고침에도 유지.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "holo:guest-mode:v1";

function load(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let guest = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (guest) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 둘러보기 진입 — 로그인 화면의 "둘러보기" 버튼에서 호출. */
export function enterGuestMode(): void {
  if (guest) return;
  guest = true;
  persist();
  emit();
}

/** 게스트 해제 — 실제 로그인 / 회원가입 완료 시 호출. */
export function exitGuestMode(): void {
  if (!guest) return;
  guest = false;
  persist();
  emit();
}

/** 현재 게스트(둘러보기) 모드인지. */
export function isGuest(): boolean {
  return guest;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 컴포넌트에서 게스트 여부를 구독 — 변경 시 리렌더된다. */
export function useIsGuest(): boolean {
  return useSyncExternalStore(subscribe, isGuest, () => false);
}
