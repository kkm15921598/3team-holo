import { useSyncExternalStore } from "react";

/**
 * 사용자 활동 store — 가입일과 접속한 날짜들을 영속화한다.
 *
 * - 첫 앱 실행 시 가입일(signupDate) 을 오늘로 기록.
 * - 앱이 열릴 때마다 오늘 날짜(YYYY-MM-DD) 를 activeDates set 에 추가.
 * - 접속일수 = activeDates.length — 가입 후 실제로 앱을 연 고유 일 수.
 */

const STORAGE_KEY = "holo:activity:v1";

type ActivityState = {
  signupDate: string; // YYYY-MM-DD
  activeDates: string[]; // sorted unique YYYY-MM-DD
};

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function loadInitial(): ActivityState {
  if (typeof window === "undefined") {
    const today = todayISO();
    return { signupDate: today, activeDates: [today] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.signupDate === "string" &&
        Array.isArray(parsed.activeDates)
      ) {
        return parsed as ActivityState;
      }
    }
  } catch {
    // ignore
  }
  const today = todayISO();
  return { signupDate: today, activeDates: [today] };
}

let state: ActivityState = loadInitial();
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

/** 첫 실행이라면 store 가 이미 오늘로 초기화되어 있으므로 persist 만 보장 */
export function ensureInitialized(): void {
  // 로드 시 이미 today 가 들어가 있지만, 일부 환경(SSR) 에서 localStorage 가
  // 없는 채로 만들어진 state 가 그대로 남는 경우를 대비해 한 번 persist.
  persist();
}

/** 오늘을 접속일로 기록 — 이미 들어 있으면 no-op */
export function markActiveToday(): void {
  const today = todayISO();
  if (state.activeDates.includes(today)) return;
  state = {
    ...state,
    activeDates: [...state.activeDates, today].sort(),
  };
  persist();
  emit();
}

export function getActivityState(): ActivityState {
  return state;
}

export function getDaysActive(): number {
  return state.activeDates.length;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => state;

/** React 컴포넌트에서 활동 상태 구독 */
export function useActivityState(): ActivityState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
