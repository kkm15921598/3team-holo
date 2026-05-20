/**
 * 게시글 "끌어올리기" 상태 저장소.
 *
 * 사용자가 본인 글을 끌어올린 시점을 글 id 별로 기록해서, 24시간 쿨다운을 강제한다.
 *  - 끌어올리면 글의 `timeAgo` 가 "방금 전" 으로 갱신돼 게시판 최상단으로 이동 (postsStore.update)
 *  - 끌어올리기 호출 자체는 이 store 에서만 timestamp 를 관리
 *  - 같은 글은 마지막 끌어올리기 후 24시간 이후에 다시 가능
 *
 * 저장: localStorage("holo:post-bumps:v1") — { [postId]: timestampMs }
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

// v3 로 키를 바꿔 이전(v1, v2) 의 단순 timestamp 구조를 자동 초기화한다.
// v3 부터는 글마다 마지막 끌어올린 시각(lastAt) + 누적 횟수(count) 를 함께 저장.
const STORAGE_KEY = "holo:post-bumps:v3";
/** 끌어올리기 사이 최소 대기 시간 (12시간). */
export const BUMP_COOLDOWN_MS = 12 * 60 * 60 * 1000;
/** 한 글에 허용되는 최대 끌어올리기 횟수. */
export const BUMP_MAX_COUNT = 10;

type BumpEntry = { lastAt: number; count: number };
type BumpMap = Record<string, BumpEntry>;

function load(): BumpMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // 각 항목이 새 스키마(lastAt, count) 인지 검증. 아니면 무시.
    const result: BumpMap = {};
    for (const [id, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        val &&
        typeof val === "object" &&
        typeof (val as BumpEntry).lastAt === "number" &&
        typeof (val as BumpEntry).count === "number"
      ) {
        result[id] = val as BumpEntry;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function save(m: BumpMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    // quota / private mode — best-effort.
  }
}

let _bumps: BumpMap = load();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): BumpMap {
  return _bumps;
}

export const bumpStore = {
  /** 마지막 끌어올리기 시각 (ms epoch). 한 번도 안 했으면 0. */
  getLastBumpAt(postId: string): number {
    return _bumps[postId]?.lastAt ?? 0;
  },
  /** 해당 글이 끌어올린 누적 횟수. */
  getCount(postId: string): number {
    return _bumps[postId]?.count ?? 0;
  },
  /** 다음 끌어올리기까지 남은 ms. 즉시 가능하면 0. */
  getRemainingMs(postId: string): number {
    const last = _bumps[postId]?.lastAt ?? 0;
    if (!last) return 0;
    return Math.max(0, BUMP_COOLDOWN_MS - (Date.now() - last));
  },
  /** 누적 횟수가 한도(BUMP_MAX_COUNT) 에 도달했는지. */
  isMaxedOut(postId: string): boolean {
    return this.getCount(postId) >= BUMP_MAX_COUNT;
  },
  /** 쿨다운이 풀려 있고, 누적 한도에 도달하지 않은 경우에만 true. */
  canBump(postId: string): boolean {
    return this.getRemainingMs(postId) === 0 && !this.isMaxedOut(postId);
  },
  /**
   * 끌어올리기 기록 — 마지막 시각 갱신 + 누적 횟수 +1.
   * 쿨다운 중이거나 누적 한도 도달 시 false 반환.
   */
  bump(postId: string): boolean {
    if (!this.canBump(postId)) return false;
    const prev = _bumps[postId];
    _bumps = {
      ..._bumps,
      [postId]: { lastAt: Date.now(), count: (prev?.count ?? 0) + 1 },
    };
    save(_bumps);
    notify();
    const userPhone = getCurrentAccount();
    if (userPhone) {
      supabase.from("users").update({ bump_data: _bumps })
        .eq("phone", userPhone).then(({ error }) => {
          if (error) console.warn("Supabase 끌어올리기 저장 실패:", error.message);
        });
    }
    return true;
  },
};

/** React: 끌어올리기 맵 전체 구독 */
export function useBumps(): BumpMap {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * 특정 글의 남은 쿨다운(ms)을 실시간으로 갱신.
 *  - 쿨다운 중이면 1분 간격 tick 으로 표시 갱신
 *  - 쿨다운이 끝나면 자동 정지
 */
export function useBumpRemaining(postId: string): number {
  const bumps = useBumps();
  const last = bumps[postId]?.lastAt ?? 0;
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!last) return;
    const remaining = BUMP_COOLDOWN_MS - (Date.now() - last);
    if (remaining <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [last]);
  if (!last) return 0;
  return Math.max(0, BUMP_COOLDOWN_MS - (Date.now() - last));
}

/** React: 특정 글의 누적 끌어올리기 횟수. 한 번도 안 했으면 0. */
export function useBumpCount(postId: string): number {
  const bumps = useBumps();
  return bumps[postId]?.count ?? 0;
}

/** "23시간 12분", "47분" 등 사람이 읽기 좋은 잔여시간 포맷. */
export function formatBumpRemaining(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

/**
 * 로그인 후 Supabase users 테이블에서 응원 데이터를 읽어 로컬과 병합.
 */
export async function syncBumpsFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("users")
    .select("bump_data")
    .eq("phone", userPhone)
    .maybeSingle();

  if (error) { console.warn("Supabase 응원 데이터 읽기 실패:", error.message); return; }
  if (!data?.bump_data || typeof data.bump_data !== "object") return;

  const remote = data.bump_data as BumpMap;
  const merged: BumpMap = { ..._bumps };
  for (const [postId, entry] of Object.entries(remote)) {
    if (!merged[postId]) merged[postId] = entry;
  }
  _bumps = merged;
  save(_bumps);
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncBumpsFromSupabase(), 1050);
  });
}
