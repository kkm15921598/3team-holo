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

/**
 * 여러 날짜에 "출석" 기록을 한꺼번에 시드 (테스트 계정용).
 * 각 ISO 날짜(YYYY-MM-DD) 에 attendance 카운트를 1 로 기록.
 * 이미 출석 기록이 있는 날짜는 덮어쓰지 않는다 (오늘 이미 출석한 사용자 보호).
 */
export function seedAttendanceDates(dates: string[]): void {
  const nextDaily = { ...state.daily };
  for (const iso of dates) {
    const cur = nextDaily[iso] ?? {};
    if ((cur.attendance ?? 0) > 0) continue;
    nextDaily[iso] = { ...cur, attendance: 1 };
  }
  state = { ...state, daily: nextDaily };
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

/**
 * "출석" 액션이 기록된 고유 날짜의 개수.
 * "1년째 입주민" 뱃지(badge_26) 조건 충족 여부를 판단할 때 사용한다.
 */
export function getAttendanceDayCount(): number {
  let count = 0;
  for (const day of Object.keys(state.daily)) {
    if ((state.daily[day]?.attendance ?? 0) > 0) count += 1;
  }
  return count;
}

/** YYYY-MM-DD 포맷 헬퍼 */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 출석 사이클(1~7일차) 상의 오늘 위치 — 연속 출석(streak) 기반.
 * 신규 사용자는 1일차에서 시작해 출석 1회마다 다음 일차로 진행하고,
 * 7일차 완료 후 8일째에는 다시 1일차로 사이클이 돌아간다.
 * 연속이 끊기면 streak 가 0 으로 떨어지므로 자연히 다시 1일차부터 시작된다.
 *
 *  - 오늘 아직 출석 전: todayPosition = (streak % 7) + 1
 *  - 오늘 이미 출석함:   todayPosition = ((streak - 1) % 7) + 1
 *
 * 각 카드의 checked 는 "현재 사이클에서 오늘 이전 일차" 또는 "오늘인데 이미 출석함" 일 때 true.
 */
export function getAttendanceCycleStatus(): {
  todayPosition: number;
  attendedToday: boolean;
  days: { day: number; checked: boolean; isToday: boolean }[];
} {
  const todayStr = ymd(new Date());
  const attendedToday = (state.daily[todayStr]?.attendance ?? 0) > 0;
  const streak = getCurrentStreak();
  const todayPosition = attendedToday
    ? ((streak - 1) % 7) + 1
    : (streak % 7) + 1;

  const days = Array.from({ length: 7 }, (_, i) => {
    const pos = i + 1;
    const isToday = pos === todayPosition;
    // 과거 일차 = 이미 완료 / 오늘 = 출석했으면 완료 / 미래 = 미완료
    const checked =
      pos < todayPosition || (pos === todayPosition && attendedToday);
    return { day: pos, checked, isToday };
  });

  return { todayPosition, attendedToday, days };
}

/**
 * 오늘을 기준으로 한 연속 출석일 수.
 * 오늘 출석을 안 했으면 어제부터 거꾸로 카운트.
 */
export function getCurrentStreak(): number {
  const todayStr = ymd(new Date());
  const cursor = new Date();
  if (!((state.daily[todayStr]?.attendance ?? 0) > 0)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let count = 0;
  // 가입한 지 얼마 안 된 사용자의 무한 루프 방지용 상한 (10000일)
  for (let i = 0; i < 10000; i++) {
    const iso = ymd(cursor);
    if ((state.daily[iso]?.attendance ?? 0) > 0) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
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
