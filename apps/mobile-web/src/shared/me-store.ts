import { useSyncExternalStore } from "react";
import { ME as INITIAL_ME } from "@/shared/mock/data";

export type Me = typeof INITIAL_ME;

const STORAGE_KEY = "holo:me:v2";

function loadInitial(): Me {
  if (typeof window === "undefined") return INITIAL_ME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        // shallow merge so any new field added to INITIAL_ME still has a default
        return { ...INITIAL_ME, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_ME;
}

let state: Me = loadInitial();
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

export function getMe(): Me {
  return state;
}

export function setMe(patch: Partial<Me>): void {
  state = { ...state, ...patch };
  persist();
  emit();
}

/** 포인트 적립 (양수만). 누적 후 me-store 갱신 */
export function earnPoints(amount: number): void {
  if (amount <= 0) return;
  setMe({ points: state.points + amount });
}

export function resetMe(): void {
  state = INITIAL_ME;
  persist();
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getSnapshot = () => state;

export function useMe(): Me {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
