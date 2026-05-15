import { useSyncExternalStore } from "react";

/**
 * 경험치(XP) store.
 *
 * - 사용자가 게시글/댓글/모임 참여/출석/친구추가 등을 할 때 awardXp(action) 호출.
 * - 각 액션은 하루 단위 cap 이 있어 한꺼번에 몰아 받는 어뷰징을 방지한다.
 * - 레벨업(현재 XP/500 단위)은 my-level-screen 의 진행도 바에 즉시 반영.
 * - 레벨 자체(stats.level) 와는 별도 — 테스트 계정처럼 seed 로 레벨을 강제할 수 있음.
 */

const STORAGE_KEY = "holo:xp:v1";
export const XP_PER_LEVEL = 500;

export type XpAction =
  | "post"
  | "comment"
  | "join"
  | "attendance"
  | "friend"
  | "likeReceived";

export const XP_CONFIG: Record<
  XpAction,
  { xp: number; dailyLimit: number; label: string }
> = {
  post:         { xp: 10, dailyLimit: 3,  label: "게시글 작성" },
  comment:      { xp: 5,  dailyLimit: 10, label: "댓글 작성" },
  join:         { xp: 20, dailyLimit: 3,  label: "모임 참여" },
  attendance:   { xp: 3,  dailyLimit: 1,  label: "출석 체크" },
  friend:       { xp: 15, dailyLimit: 5,  label: "이웃 친구 추가" },
  likeReceived: { xp: 2,  dailyLimit: 20, label: "게시글 좋아요 받기" },
};

type XpState = {
  totalXp: number;
  /** YYYY-MM-DD -> action -> 그 날 부여된 횟수 */
  daily: Record<string, Partial<Record<XpAction, number>>>;
};

const DEFAULT_STATE: XpState = { totalXp: 0, daily: {} };

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadInitial(): XpState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.totalXp === "number" &&
        typeof parsed.daily === "object"
      ) {
        return parsed as XpState;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

let state: XpState = loadInitial();
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

/**
 * 사용자 액션 1회당 XP 부여.
 * - 일일 cap 도달 시 capped=true 와 함께 gained=0 반환 (어뷰징 방지).
 * - cap 도달 안 했으면 XP 증가 + 일일 카운트 +1.
 */
export function awardXp(action: XpAction): { gained: number; capped: boolean } {
  const cfg = XP_CONFIG[action];
  const today = todayISO();
  const todayCounts = state.daily[today] ?? {};
  const count = todayCounts[action] ?? 0;
  if (count >= cfg.dailyLimit) {
    return { gained: 0, capped: true };
  }
  state = {
    totalXp: state.totalXp + cfg.xp,
    daily: {
      ...state.daily,
      [today]: { ...todayCounts, [action]: count + 1 },
    },
  };
  persist();
  emit();
  return { gained: cfg.xp, capped: false };
}

/** XP 총량을 직접 설정 — 테스트 계정 시드 시 사용 */
export function setTotalXp(xp: number): void {
  state = { ...state, totalXp: Math.max(0, Math.floor(xp)) };
  persist();
  emit();
}

/** 모든 XP 초기화 (신규 가입자 / 다른 계정 로그인 시) */
export function resetXp(): void {
  state = DEFAULT_STATE;
  persist();
  emit();
}

export function getXpState(): XpState {
  return state;
}

/** 오늘 해당 액션의 남은 cap 횟수 */
export function getDailyRemaining(action: XpAction): number {
  const cfg = XP_CONFIG[action];
  const today = todayISO();
  const count = state.daily[today]?.[action] ?? 0;
  return Math.max(0, cfg.dailyLimit - count);
}

/** 현재 레벨 안에서의 XP 진행도 */
export function getLevelProgress(): {
  current: number;
  required: number;
  remaining: number;
  percent: number;
} {
  const current = state.totalXp % XP_PER_LEVEL;
  return {
    current,
    required: XP_PER_LEVEL,
    remaining: XP_PER_LEVEL - current,
    percent: Math.round((current / XP_PER_LEVEL) * 100),
  };
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => state;

export function useXpState(): XpState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
