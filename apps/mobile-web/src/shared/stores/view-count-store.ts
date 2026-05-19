import { useSyncExternalStore } from "react";
import type { Post } from "@/shared/mock/data";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/**
 * 게시글 조회수.
 *
 * 표시값 = baseline(post.likes / comments 기반 결정적 값) + 사용자 누적 증분.
 * - baseline 은 likes·comments·id 만 있으면 항상 같은 값이라 mock 데이터에 직접
 *   views 필드를 박아두지 않아도 자연스러운 초기값을 만들 수 있다.
 * - 사용자가 상세 화면에 진입할 때마다 +1 (incrementViewCount).
 *   여러 번 들락거리면 누적되어 늘어남 → 자기 글 조회수가 올라가는 데모 효과.
 */

const STORAGE_KEY = "holo:view-counts:v1";

function loadInitial(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // 숫자 값만 남김
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
        }
        return out;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

let counts: Record<string, number> = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore (quota / private mode)
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** post id 문자열을 안정적 양의 정수 해시로 변환 (FNV-1a 변형) */
function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 게시글의 기본 조회수 — post id 해시만으로 결정. 같은 post 면 항상 같은 값.
 *
 * 분포 (570개 글 기준 대략):
 *  - 0~50    : ~92% (≈ 525개) — 평범한 글, 0~50 사이에서 골고루
 *  - 51~100  : ~5.5% (≈ 30개) — 조금 관심받은 글
 *  - 101~200 : ~2%  (≈ 11개)  — 인기 글 (몇 개)
 *  - 201~300 : ~0.5% (≈ 3~5개) — 극상위 인기 글 (극소수)
 */
export function baselineViewsForPost(post: Post): number {
  const h = stableHash(post.id);
  const bucket = h % 1000;
  // 가장 좁은 구간(상위 인기)부터 차례로 판정.
  if (bucket < 5) {
    // 201~300 — 극소수
    return 201 + ((h >>> 3) % 100);
  }
  if (bucket < 25) {
    // 101~200 — 몇 개
    return 101 + ((h >>> 3) % 100);
  }
  if (bucket < 80) {
    // 51~100 — 약 30개 정도
    return 51 + ((h >>> 3) % 50);
  }
  // 0~50 — 대부분 (균등 분포)
  return (h >>> 3) % 51;
}

/** 상세 화면 진입 시 호출 — 사용자 증분 +1 */
export function incrementViewCount(id: string): void {
  counts = { ...counts, [id]: (counts[id] ?? 0) + 1 };
  persist();
  emit();
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("users").update({ view_counts: counts })
      .eq("phone", userPhone).then(({ error }) => {
        if (error) console.warn("Supabase 조회수 저장 실패:", error.message);
      });
  }
}

/** 표시용 총 조회수 = baseline + 사용자 증분 */
export function getTotalViews(post: Post): number {
  return baselineViewsForPost(post) + (counts[post.id] ?? 0);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const snapshot = () => counts;

/** 모든 조회수 증분 맵을 React 컴포넌트에서 구독 */
export function useViewCounts(): Record<string, number> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
