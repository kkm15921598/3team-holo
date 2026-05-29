import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(s: ViewedEntry[]) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ viewed_posts: s })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 본 글 저장 실패:", error.message);
    });
}

/**
 * 사용자가 실제로 클릭해서 본 게시글의 id 와 마지막 조회 시각을 영속화한다.
 *
 * - "최근 본 글" 마이페이지에 노출될 목록의 원천.
 * - 같은 글을 다시 보면 viewedAt 만 갱신되어 목록 상단으로 올라간다.
 * - 가입 직후 사용자에겐 비어 있고, 글을 누를 때마다 하나씩 쌓인다.
 */

const STORAGE_KEY = "holo:viewed-posts:v1";
const MAX_ENTRIES = 50;

export type ViewedEntry = {
  id: string;
  viewedAt: number; // unix ms
};

function loadInitial(): ViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ViewedEntry[];
    }
  } catch {
    // ignore
  }
  return [];
}

let state: ViewedEntry[] = loadInitial();
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
 * post 를 봤다고 기록. 이미 기록되어 있으면 viewedAt 만 갱신해 가장 최근으로.
 * 최대 MAX_ENTRIES 까지만 유지 — 가장 오래된 항목부터 잘려나감.
 */
export function markPostViewed(id: string): void {
  const now = Date.now();
  const next = state.filter((e) => e.id !== id);
  next.unshift({ id, viewedAt: now });
  state = next.slice(0, MAX_ENTRIES);
  persist();
  emit();
  syncToSupabase(state);
}

/** 이미 본(=조회 기록이 있는) 글인지 — 조회수 중복 증가 방지 가드용. */
export function hasViewedPost(id: string): boolean {
  return state.some((e) => e.id === id);
}

/** 마이페이지 관리 삭제 — 지정한 id 들을 viewed 목록에서 제거 */
export function removeViewedPosts(ids: string[]): void {
  const set = new Set(ids);
  state = state.filter((e) => !set.has(e.id));
  persist();
  emit();
  syncToSupabase(state);
}

/** 가장 최근에 본 순서대로 id 배열 반환 */
export function getViewedIdsByRecency(): string[] {
  return state.map((e) => e.id);
}

/**
 * viewed 엔트리 전체 교체 — 테스트 계정 시드 시 사용.
 * 입력 배열의 0번 인덱스가 가장 최근, 마지막이 가장 오래된 것.
 */
export function setViewedIds(ids: string[]): void {
  const now = Date.now();
  state = ids.map((id, i) => ({ id, viewedAt: now - i * 1000 }));
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

/** viewed 엔트리 전체를 React 컴포넌트에서 구독 (최근순) */
export function useViewedEntries(): ViewedEntry[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * 로그인 후 Supabase users 테이블에서 본 게시글 목록을 읽어 로컬과 병합.
 */
export async function syncViewedPostsFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("users")
    .select("viewed_posts")
    .eq("phone", userPhone)
    .maybeSingle();

  if (error) { console.warn("Supabase 본 게시글 읽기 실패:", error.message); return; }
  if (!data || !Array.isArray(data.viewed_posts) || (data.viewed_posts as unknown[]).length === 0) return;

  const existingIds = new Set(state.map((e) => e.id));
  const toAdd = (data.viewed_posts as ViewedEntry[]).filter((e) => !existingIds.has(e.id));
  if (toAdd.length === 0) return;

  state = [...state, ...toAdd].sort((a, b) => b.viewedAt - a.viewedAt);
  persist();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncViewedPostsFromSupabase(), 950);
  });
}
