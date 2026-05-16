import { useSyncExternalStore } from "react";

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

function loadInitial(): AccountStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.level === "number") {
        return {
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
