import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/**
 * 마이페이지 상단의 4개 통계 (레벨/뱃지/칭호) 를 영속화.
 * 모임 참여 카운트는 joined-store 로 동적 계산되어 여기에 들어가지 않는다.
 *
 * 신규 가입 기본값: 레벨 1, 뱃지 1, 칭호 1.
 * 테스트 계정 로그인 시 seedAccount 가 이 값을 덮어쓴다.
 */

const STORAGE_KEY = "holo:account-stats:v1";

export type AccountStats = {
  level: number;
  /** 실제로 획득한 뱃지 id 리스트 — 마이페이지에서 활성으로 보이는 항목 */
  acquiredBadgeIds: string[];
  /** 실제로 획득한 칭호 리스트 */
  acquiredTitles: string[];
  /**
   * 뱃지 id → 실제 획득 날짜(YYYY-MM-DD) 매핑.
   * 실제 앱 기능에서 뱃지가 발급될 때 recordBadgeAcquired(id) 로 오늘 날짜가 기록된다.
   * mock(BADGES) 의 b.date 는 시드 데이터일 뿐이며, 이 맵에 들어 있는 값이 우선이다.
   */
  acquiredBadgeDates: Record<string, string>;
};

/**
 * 신규 가입자 기본값.
 * - 뱃지: "홀로 입주자"(badge_24) 가입 즉시 발급
 * - 칭호: "#홀로_입주자" 가입 즉시 발급
 */
const DEFAULT_STATS: AccountStats = {
  level: 1,
  acquiredBadgeIds: ["badge_24"],
  acquiredTitles: ["#홀로_입주자"],
  acquiredBadgeDates: {},
};

/**
 * 가입 시 자동 발급되는 스타터 항목 — 뱃지 / 칭호 모두 "홀로 입주자".
 * loadInitial() 에서 기존 사용자 상태에 누락돼 있으면 자동 추가(backfill)한다.
 * 옛 빌드에서 발급 로직이 빠져 있던 시기에 가입한 계정도 새 빌드에 들어왔을 때
 * 별도 액션 없이 자동으로 보유 처리되도록 보장하는 안전장치.
 */
const STARTER_BADGE_ID = "badge_24";
const STARTER_TITLE_NAME = "#홀로_입주자";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function backfillStarterItems(stats: AccountStats): AccountStats {
  const hasStarterBadge = stats.acquiredBadgeIds.includes(STARTER_BADGE_ID);
  const hasStarterTitle = stats.acquiredTitles.includes(STARTER_TITLE_NAME);
  const hasStarterBadgeDate = !!stats.acquiredBadgeDates[STARTER_BADGE_ID];
  if (hasStarterBadge && hasStarterTitle && hasStarterBadgeDate) return stats;
  return {
    ...stats,
    acquiredBadgeIds: hasStarterBadge
      ? stats.acquiredBadgeIds
      : [STARTER_BADGE_ID, ...stats.acquiredBadgeIds],
    acquiredTitles: hasStarterTitle
      ? stats.acquiredTitles
      : [STARTER_TITLE_NAME, ...stats.acquiredTitles],
    // 백필로 뱃지를 추가한 경우엔 "오늘" 기준으로 획득일도 기록 — 뱃지 목록에서
    // 최근 획득순으로 정렬할 때 새 뱃지가 상단에 표시되도록 한다.
    acquiredBadgeDates: hasStarterBadgeDate
      ? stats.acquiredBadgeDates
      : { ...stats.acquiredBadgeDates, [STARTER_BADGE_ID]: todayKey() },
  };
}

function loadInitial(): AccountStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.level === "number") {
        const base: AccountStats = {
          level: parsed.level,
          acquiredBadgeIds: Array.isArray(parsed.acquiredBadgeIds)
            ? parsed.acquiredBadgeIds
            : [],
          acquiredTitles: Array.isArray(parsed.acquiredTitles)
            ? parsed.acquiredTitles
            : [],
          acquiredBadgeDates:
            (parsed.acquiredBadgeDates && typeof parsed.acquiredBadgeDates === "object")
              ? parsed.acquiredBadgeDates
              : {},
        };
        return backfillStarterItems(base);
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATS;
}

let state: AccountStats = loadInitial();
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

/** 뱃지/칭호/레벨을 Supabase users 테이블에 동기화 (best-effort) */
function syncToSupabase(s: AccountStats) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({
    level: s.level,
    acquired_badge_ids: s.acquiredBadgeIds,
    acquired_titles: s.acquiredTitles,
    acquired_badge_dates: s.acquiredBadgeDates,
  }).eq("phone", userPhone).then(({ error }) => {
    if (error) console.warn("Supabase 뱃지/칭호 저장 실패:", error.message);
  });
}

export function getStats(): AccountStats {
  return state;
}

/** 통계 덮어쓰기 — 테스트 계정 시드 시 사용. 호출자가 안 넘긴 필드는 기존 값 유지. */
export function setStats(stats: Partial<AccountStats> & Pick<AccountStats, "level">): void {
  state = {
    level: stats.level,
    acquiredBadgeIds: stats.acquiredBadgeIds ?? state.acquiredBadgeIds,
    acquiredTitles: stats.acquiredTitles ?? state.acquiredTitles,
    acquiredBadgeDates: stats.acquiredBadgeDates ?? state.acquiredBadgeDates,
  };
  persist();
  emit();
  syncToSupabase(state);
}

/**
 * 실제 앱에서 뱃지가 발급될 때 호출 — 오늘 날짜(YYYY-MM-DD)를 기록하고
 * acquiredBadgeIds 목록에도 추가한다. 이미 보유 중인 뱃지면 no-op.
 * 발급에 성공해서 새로 추가됐다면 true 를 반환 (UI 토스트 분기용).
 */
export function recordBadgeAcquired(badgeId: string): boolean {
  if (state.acquiredBadgeIds.includes(badgeId)) return false;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  state = {
    ...state,
    acquiredBadgeIds: [...state.acquiredBadgeIds, badgeId],
    acquiredBadgeDates: state.acquiredBadgeDates[badgeId]
      ? state.acquiredBadgeDates
      : { ...state.acquiredBadgeDates, [badgeId]: today },
  };
  persist();
  emit();
  syncToSupabase(state);
  return true;
}

/** 뱃지 획득일 lookup — store 에 기록된 실제 날짜를 우선 반환 */
export function getBadgeAcquiredDate(badgeId: string): string | undefined {
  return state.acquiredBadgeDates[badgeId];
}

/**
 * 칭호 발급 — acquiredTitles 에 추가. 이미 보유 중이면 no-op.
 * 새로 발급됐으면 true, 이미 있었으면 false.
 */
export function recordTitleAcquired(titleName: string): boolean {
  if (state.acquiredTitles.includes(titleName)) return false;
  state = {
    ...state,
    acquiredTitles: [...state.acquiredTitles, titleName],
  };
  persist();
  emit();
  syncToSupabase(state);
  return true;
}

/** 신규 가입자 기본값(1/1/1) 으로 리셋 */
export function resetStats(): void {
  setStats(DEFAULT_STATS);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => state;

export function useAccountStats(): AccountStats {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Supabase users 테이블에서 뱃지/칭호/레벨 읽어와 로컬 상태 갱신.
 */
export async function syncStatsFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("level, acquired_badge_ids, acquired_titles, acquired_badge_dates")
    .eq("phone", userPhone)
    .single();
  if (error || !data) return;
  state = {
    level: (data.level as number) ?? state.level,
    acquiredBadgeIds: (data.acquired_badge_ids as string[]) ?? state.acquiredBadgeIds,
    acquiredTitles: (data.acquired_titles as string[]) ?? state.acquiredTitles,
    acquiredBadgeDates: (data.acquired_badge_dates as Record<string, string>) ?? state.acquiredBadgeDates,
  };
  persist();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncStatsFromSupabase(), 450);
  });
}
