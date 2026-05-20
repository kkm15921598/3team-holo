import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

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

/** 활동 데이터를 Supabase users 테이블에 동기화 (best-effort) */
function syncActivityToSupabase(s: ActivityState) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({
    signup_date: s.signupDate,
    active_dates: s.activeDates,
  }).eq("phone", userPhone).then(({ error }) => {
    if (error) console.warn("Supabase 활동 저장 실패:", error.message);
  });
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
  syncActivityToSupabase(state);
}

export function getActivityState(): ActivityState {
  return state;
}

export function getDaysActive(): number {
  return state.activeDates.length;
}

/**
 * activity 상태를 통째로 교체 — 테스트 계정 로그인 시 가입일(joinedAt) 부터
 * 오늘까지의 활동 이력을 한꺼번에 시드할 때 사용. activeDates 는 중복 제거 후 정렬한다.
 */
export function setActivityState(next: ActivityState): void {
  const unique = Array.from(new Set(next.activeDates)).sort();
  state = { signupDate: next.signupDate, activeDates: unique };
  persist();
  emit();
  syncActivityToSupabase(state);
}

/**
 * activity 상태를 기본값으로 되돌림 (signupDate=오늘, activeDates=[오늘]).
 * 신규 가입자/계정 전환 시 호출.
 */
export function resetActivityStore(): void {
  const today = todayISO();
  state = { signupDate: today, activeDates: [today] };
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

/** React 컴포넌트에서 활동 상태 구독 */
export function useActivityState(): ActivityState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * 로그인 후 Supabase users 테이블에서 활동 데이터를 읽어 로컬과 병합.
 * activeDates는 합집합으로 병합해 어느 기기의 출석도 누락되지 않게 한다.
 */
export async function syncActivityFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("users")
    .select("signup_date, active_dates")
    .eq("phone", userPhone)
    .maybeSingle();

  if (error) { console.warn("Supabase 활동 데이터 읽기 실패:", error.message); return; }
  if (!data) return;

  let changed = false;

  if (typeof data.signup_date === "string" && data.signup_date && !state.signupDate) {
    state = { ...state, signupDate: data.signup_date as string };
    changed = true;
  }

  if (Array.isArray(data.active_dates) && (data.active_dates as unknown[]).length > 0) {
    const merged = new Set([...state.activeDates, ...(data.active_dates as string[])]);
    const sorted = [...merged].sort();
    if (sorted.length !== state.activeDates.length) {
      state = { ...state, activeDates: sorted };
      changed = true;
    }
  }

  if (changed) { persist(); emit(); }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncActivityFromSupabase(), 1000);
  });
}
