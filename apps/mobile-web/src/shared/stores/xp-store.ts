import { useEffect, useState, useSyncExternalStore } from "react";
import { getStats, setStats } from "@/shared/stores/account-stats-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { addPoints } from "@/features/myroom/myroom-store";

/**
 * 레벨업 보너스 포인트 — my-level-screen 의 LEVEL_BENEFITS 표와 동일해야 한다.
 * (UI 는 "보너스 포인트 +100P" 라고 약속하는데 실제 지급 코드가 없어 한 번도 안 줬다.)
 */
const LEVEL_BONUS: Record<number, number> = {
  5: 100,
  10: 300,
  15: 500,
  20: 1000,
  25: 2000,
  30: 5000,
};

/**
 * 경험치(XP) store.
 *
 * - 사용자가 게시글/댓글/모임 참여/출석/친구추가 등을 할 때 awardXp(action) 호출.
 * - 각 액션은 하루 단위 cap 이 있어 한꺼번에 몰아 받는 어뷰징을 방지한다.
 * - 레벨업(현재 XP/500 단위)은 my-level-screen 의 진행도 바에 즉시 반영.
 * - 레벨 자체(stats.level) 와는 별도 — 테스트 계정처럼 seed 로 레벨을 강제할 수 있음.
 */

const STORAGE_KEY = "holo:xp:v1";

/**
 * 레벨업에 필요한 경험치 — 레벨 N 에서 N+1 으로 올라가는 데 필요한 XP.
 *
 * 사용자가 직접 지정한 곡선. 초반은 두 레벨씩 동일한 값으로 묶여 빠르게 오르고,
 * 중반부터 10 XP 씩 증가, 21레벨 이후엔 20 XP 씩 증가, 마지막은 50 XP 점프.
 *
 *   누적: 2 = 30, 3 = 60, 4 = 100, 5 = 140, 6 = 190, 7 = 240, 8 = 300, 9 = 360,
 *         10 = 430, ... (만렙 30 까지 cumulativeXpForLevel(N) 으로 계산 가능)
 */
export const LEVEL_XP_REQUIRED: Record<number, number> = {
  1: 30,   // → Lv 2
  2: 30,   // → Lv 3
  3: 40,   // → Lv 4
  4: 40,   // → Lv 5
  5: 50,   // → Lv 6
  6: 50,   // → Lv 7
  7: 60,   // → Lv 8
  8: 60,   // → Lv 9
  9: 70,   // → Lv 10
  10: 80,  // → Lv 11
  11: 90,  // → Lv 12
  12: 100, // → Lv 13
  13: 110, // → Lv 14
  14: 120, // → Lv 15
  15: 130, // → Lv 16
  16: 140, // → Lv 17
  17: 150, // → Lv 18
  18: 160, // → Lv 19
  19: 170, // → Lv 20
  20: 180, // → Lv 21
  21: 200, // → Lv 22
  22: 220, // → Lv 23
  23: 240, // → Lv 24
  24: 260, // → Lv 25
  25: 280, // → Lv 26
  26: 300, // → Lv 27
  27: 350, // → Lv 28
  28: 400, // → Lv 29
  29: 500, // → Lv 30 (만렙)
  30: 500, // 만렙. 표시상만 사용.
};

/** 호환용 기본값 — 레벨이 명시되지 않은 호출에서 폴백으로 사용. 1레벨 요구치. */
export const XP_PER_LEVEL = LEVEL_XP_REQUIRED[1];

/** 특정 레벨에서 다음 레벨로 올라가는 데 필요한 XP. 테이블에 없으면 최댓값으로 폴백. */
export function xpRequiredForLevel(level: number): number {
  return LEVEL_XP_REQUIRED[level] ?? LEVEL_XP_REQUIRED[30];
}

/**
 * 1레벨에서 시작해 특정 레벨에 막 도달하는 데 필요한 누적 XP.
 *
 * 예) cumulativeXpForLevel(1) === 0 (이미 1레벨)
 *     cumulativeXpForLevel(2) === LEVEL_XP_REQUIRED[1] === 30
 *     cumulativeXpForLevel(3) === 30 + 40 === 70
 *
 * 테스트 계정 시드처럼 "Lv N 의 시작점에 위치시키고 싶다" 면 이 값을 setTotalXp 에 그대로 넣으면 됨.
 */
export function cumulativeXpForLevel(level: number): number {
  let sum = 0;
  for (let i = 1; i < level; i++) {
    sum += LEVEL_XP_REQUIRED[i] ?? 0;
  }
  return sum;
}

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
  // friend 항목은 화면 노출에서 제외 — 사용자 요청. awardXp("friend") 가 코드 곳곳에 남아있어
  // 타입/스토어 구조 호환을 위해 키는 유지하되, UI 출력 시 화면 단에서 필터링한다.
  friend:       { xp: 15, dailyLimit: 5,  label: "이웃 친구 추가" },
  likeReceived: { xp: 2,  dailyLimit: 20, label: "게시글 좋아요 받기" },
};

/** my-level-screen 에서 "경험치 획득 방법" 목록으로 노출할 액션 — friend 제외.
 *  likeReceived 도 제외: 단일 기기 환경상 '내 글이 좋아요 받음' 적립 트리거(awardXp)가
 *  코드에 없어 실제로 적립되지 않으므로, 안내만 떠서 혼란을 주지 않도록 숨긴다.
 *  (키/타입은 유지 — 추후 멀티유저 적립 구현 시 재노출 가능) */
export const VISIBLE_XP_ACTIONS: XpAction[] = [
  "post",
  "comment",
  "join",
  "attendance",
];

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

/**
 * 누적 XP 로부터 현재 도달 레벨을 계산.
 *
 * LEVEL_XP_REQUIRED[N] 은 "N → N+1 로 가는 데 필요한 XP".
 * 그래서 1레벨에서 시작해 remaining 이 그 값보다 크면 다음 레벨로 진행하고 차감.
 * 만렙(30) 에 도달하면 멈춤.
 */
export function levelFromTotalXp(totalXp: number): number {
  let remaining = Math.max(0, totalXp);
  let level = 1;
  while (level < 30 && remaining >= LEVEL_XP_REQUIRED[level]) {
    remaining -= LEVEL_XP_REQUIRED[level];
    level += 1;
  }
  return level;
}

/**
 * 레벨을 누적 XP 기준으로 재계산해 stats.level 과 일치시킨다(levelFromTotalXp 가 진실).
 * 로그인 복원(syncAllUserDataFromSupabase) 직후 호출 — 과거 버그로 Supabase 의
 * level 이 XP 와 어긋나 저장된 계정(레벨↔가구/활동 불일치)을 자동 보정한다.
 * setStats 가 Supabase 에도 반영하므로 한 번 로그인하면 서버 값까지 치유된다.
 */
export function reconcileLevelFromXp(): void {
  const correct = levelFromTotalXp(state.totalXp);
  const stats = getStats();
  // ★상향만★ — XP sync 가 일시 실패해 totalXp 가 0/구값으로 남았을 때 레벨을 끌어내려
  // Supabase 에 잘못 덮어쓰는 사고를 막는다(웬디 QA 지적). 손상 복구는 본래 '레벨이
  // 부당하게 낮아진' 케이스이므로 올리는 방향만 허용하면 충분하고 안전하다.
  if (correct > stats.level) {
    setStats({ ...stats, level: correct });
  }
}

/** 레벨업 직후 축하 모달을 띄우기 위한 pending 상태. 한 액션이 한 단계 이상 점프하면 toLevel 이 가장 높은 도달 레벨. */
type PendingLevelUp = { fromLevel: number; toLevel: number };
let pendingLevelUp: PendingLevelUp | null = null;
const levelUpListeners = new Set<() => void>();

function emitLevelUp() {
  levelUpListeners.forEach((l) => l());
}

export function getPendingLevelUp(): PendingLevelUp | null {
  return pendingLevelUp;
}

/** 축하 모달이 닫힐 때 호출 — pending 비움. */
export function clearPendingLevelUp(): void {
  if (pendingLevelUp === null) return;
  pendingLevelUp = null;
  emitLevelUp();
}

/** 컴포넌트에서 pending 을 구독해서 모달을 띄울 때 사용. */
export function usePendingLevelUp(): PendingLevelUp | null {
  const [value, setValue] = useState<PendingLevelUp | null>(pendingLevelUp);
  useEffect(() => {
    const listener = () => setValue(pendingLevelUp);
    levelUpListeners.add(listener);
    listener();
    return () => {
      levelUpListeners.delete(listener);
    };
  }, []);
  return value;
}

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

/** 경험치/출석 데이터를 Supabase users 테이블에 동기화 (best-effort) */
function syncXpToSupabase(s: XpState) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({
    total_xp: s.totalXp,
    daily_xp: s.daily,
  }).eq("phone", userPhone).then(({ error }) => {
    if (error) console.warn("Supabase XP 저장 실패:", error.message);
  });
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
  // 시작 전 한 번 점검 — 옛 시드 데이터(500/레벨 공식) 로 stats.level 이 totalXp 와 어긋났을 가능성을
  // 여기서 한 번에 보정한다. levelFromTotalXp 가 진실. 모자라면 stats.level 을 올려준다.
  // (예: 시드로 totalXp=340 이 들어왔는데 stats.level=1 인 경우, 새 테이블 기준으론 이미 Lv6 임)
  const currentLevelByXp = levelFromTotalXp(state.totalXp);
  const statsNow = getStats();
  if (currentLevelByXp > statsNow.level) {
    setStats({ ...statsNow, level: currentLevelByXp });
  }

  // XP 적립 전/후 레벨을 비교해 레벨업이 발생했는지 감지한다.
  // stats.level 은 별도 store 라 동기적으로 setStats 로 끌어올리고, 축하 모달용 pending 상태를 세팅한다.
  const oldLevel = levelFromTotalXp(state.totalXp);
  state = {
    totalXp: state.totalXp + cfg.xp,
    daily: {
      ...state.daily,
      [today]: { ...todayCounts, [action]: count + 1 },
    },
  };
  persist();
  emit();
  syncXpToSupabase(state);
  const newLevel = levelFromTotalXp(state.totalXp);
  if (newLevel > oldLevel) {
    // 한 액션으로 두 레벨 이상 점프하는 경우가 거의 없지만, 정확히 최종 도달 레벨을 기록.
    const currentStats = getStats();
    if (newLevel > currentStats.level) {
      setStats({ ...currentStats, level: newLevel });
    }
    pendingLevelUp = { fromLevel: oldLevel, toLevel: newLevel };
    emitLevelUp();
    // 도달한 마일스톤 레벨마다 보너스 포인트 지급 — UI 약속과 실제 지급을 일치시킨다.
    // oldLevel(이미 보너스 받은 레벨) 초과 ~ newLevel 이하 구간의 마일스톤만 지급해
    // 시드 보정/중복 적립을 막는다.
    for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
      const bonus = LEVEL_BONUS[lv];
      if (bonus) addPoints(bonus, { title: "레벨 업 보너스", note: `Lv.${lv}` });
    }
  }
  return { gained: cfg.xp, capped: false };
}

/** XP 총량을 직접 설정 — 테스트 계정 시드 시 사용 */
export function setTotalXp(xp: number): void {
  state = { ...state, totalXp: Math.max(0, Math.floor(xp)) };
  persist();
  emit();
  syncXpToSupabase(state);
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
  syncXpToSupabase(state);
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

export function getDailyRemaining(action: XpAction): number {
  const cfg = XP_CONFIG[action];
  const today = todayISO();
  const count = state.daily[today]?.[action] ?? 0;
  return Math.max(0, cfg.dailyLimit - count);
}


export function getLevelProgress(currentLevel = 1): {
  current: number;
  required: number;
  remaining: number;
  percent: number;
} {
  // 기준 레벨을 누적 XP가 실제로 지지하는 레벨로 클램프 — stats.level 이 (과거 버그로)
  // totalXp 가 지지하는 레벨보다 높으면 base>totalXp 가 되어 진행도가 0%로 잘못 표시됐다.
  const effectiveLevel = Math.min(currentLevel, levelFromTotalXp(state.totalXp));
  // 최고 레벨(30)에는 다음 레벨이 없다. xpRequiredForLevel(30) 은 '30→31' 가정값이라
  // 그대로 쓰면 만렙인데도 "다음 레벨까지 500 XP / 0%" 로 잘못 표시된다 → 100% 로 고정.
  if (effectiveLevel >= 30) {
    const base = cumulativeXpForLevel(30);
    const current = Math.max(0, state.totalXp - base);
    return { current, required: current, remaining: 0, percent: 100 };
  }
  const required = xpRequiredForLevel(effectiveLevel);
  // 현재 레벨 구간 내 누적 XP — 해당 레벨 진입 시점의 총 XP를 빼야 정확한 진행도가 나온다.
  // (totalXp % required 는 레벨 구간과 무관한 나머지라 틀린 값이 나올 수 있음)
  const base = cumulativeXpForLevel(effectiveLevel);
  const current = Math.max(0, state.totalXp - base);
  return {
    current,
    required,
    remaining: Math.max(0, required - current),
    percent: Math.min(100, Math.round((current / required) * 100)),
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

/**
 * Supabase users 테이블에서 XP/출석 데이터 읽어와 로컬 상태 갱신.
 */
export async function syncXpFromSupabase(): Promise<void> {
  // 신규 가입 직후 2분간은 Supabase 구(舊) 데이터가 방금 저장한 데이터를 덮어쓰지 않도록 skip.
  const _freshTs = typeof window !== "undefined" ? window.localStorage.getItem("holo:fresh-signup") : null;
  if (_freshTs && Date.now() - parseInt(_freshTs) < 120_000) return;

  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("total_xp, daily_xp")
    .eq("phone", userPhone)
    .single();
  if (error || !data) return;
  if (data.total_xp != null) {
    // daily 도 totalXp 처럼 카운트가 줄지 않게 날짜·액션별 Math.max 로 병합한다.
    // (이전엔 remote 로 통째 교체 → remote daily 가 비거나 더 작으면 오늘 캡이 되돌려져
    //  일일 적립 한도를 우회할 수 있었다. awards 는 같은 날 단조 증가만 하므로 max 가 안전)
    const remoteDaily = (data.daily_xp as typeof state.daily) ?? {};
    const mergedDaily: typeof state.daily = { ...state.daily };
    for (const date of Object.keys(remoteDaily)) {
      const localDay = mergedDaily[date] ?? {};
      const remoteDay = remoteDaily[date] ?? {};
      const day: Partial<Record<XpAction, number>> = { ...localDay };
      for (const action of Object.keys(remoteDay) as XpAction[]) {
        day[action] = Math.max(localDay[action] ?? 0, remoteDay[action] ?? 0);
      }
      mergedDaily[date] = day;
    }
    state = {
      ...state,
      totalXp: Math.max(state.totalXp, (data.total_xp as number)),
      daily: mergedDaily,
    };
    persist();
    listeners.forEach((l) => l());
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncXpFromSupabase(), 500);
  });
}
