// Module-level posts store. Initial data comes from the mock POSTS array.
// New posts published from Board5 are prepended via `prepend` and consumed
// reactively by Board2 (board-list-screen) through `subscribe`.
//
// ── 영속화 (localStorage) ───────────────────────────────────────────
// 이전엔 메모리에만 저장해서 새 글 작성 직후 페이지를 새로고침하거나
// 개발 중 Vite HMR 이 발생하면 작성한 글이 사라졌다. 이제 모든 변경을
// localStorage 에 기록하고 모듈 로드 시점에 복원한다.
//   - INITIAL_POSTS (mock) 은 항상 베이스로 깔리고
//   - 사용자가 새로 만든 글만 별도로 저장해서 다음 로드 때 prepend 한다.

import { POSTS as INITIAL_POSTS, type Post } from "@/shared/mock/data";

const STORAGE_KEY = "holo:user-posts:v1";

/**
 * "방금 전 / N분 전 / N시간 전 / N일 전 / N주 전" 표기를 분 단위 수치로 변환.
 * 게시판 글을 최신순(분 단위 작은 값이 먼저)으로 정렬할 때 사용한다.
 */
function parseTimeAgoMinutes(timeAgo: string): number {
  if (!timeAgo) return Number.POSITIVE_INFINITY;
  if (/방금/.test(timeAgo)) return 0;
  const m = timeAgo.match(/(\d+)\s*(분|시간|일|주)/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  switch (m[2]) {
    case "분":
      return n;
    case "시간":
      return n * 60;
    case "일":
      return n * 60 * 24;
    case "주":
      return n * 60 * 24 * 7;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

/**
 * 게시판에 노출되는 글을 최신순(작성 시점이 가까운 순)으로 정렬.
 * timeAgo 값이 같으면 입력 순서를 유지한다.
 */
function sortByRecency(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const da = parseTimeAgoMinutes(a.timeAgo);
    const db = parseTimeAgoMinutes(b.timeAgo);
    return da - db;
  });
}

/**
 * localStorage 에서 사용자가 만든 / 수정한 글을 복원해 mock INITIAL_POSTS 와 병합.
 *  - 같은 id 가 있으면 user 측 값으로 덮어씀 (수정 반영)
 *  - mock 에 없던 새 글은 그대로 추가
 *  - removed id 목록도 함께 저장돼 mock 글 삭제 상태도 복원
 */
type PersistedShape = {
  /** 사용자가 새로 만든 / 수정한 글 */
  posts?: Post[];
  /** 사용자가 삭제한 글 id (mock 글 삭제도 기억) */
  removedIds?: string[];
};

function loadPersisted(): PersistedShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedShape;
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
    };
  } catch {
    return {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    // mock 에는 없는 글 + mock 글 중 수정된 것 = 사용자 변경분.
    // 모든 _posts 를 그대로 저장하면 mock 데이터까지 중복 저장되니, mock 과 다른 항목만 골라낸다.
    const baseMap = new Map(INITIAL_POSTS.map((p) => [p.id, p]));
    const userPosts = _posts.filter((p) => {
      const base = baseMap.get(p.id);
      return !base || JSON.stringify(base) !== JSON.stringify(p);
    });
    const baseIds = new Set(INITIAL_POSTS.map((p) => p.id));
    const currentIds = new Set(_posts.map((p) => p.id));
    const removedIds = [...baseIds].filter((id) => !currentIds.has(id));
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ posts: userPosts, removedIds }),
    );
  } catch {
    // quota / private 모드 — 영속화는 best-effort.
  }
}

function buildInitial(): Post[] {
  const persisted = loadPersisted();
  const removed = new Set(persisted.removedIds ?? []);
  const userPosts = persisted.posts ?? [];
  const userById = new Map(userPosts.map((p) => [p.id, p]));
  // mock 베이스에서 삭제된 글 제거 + 같은 id 면 사용자 값으로 덮어씀.
  const merged: Post[] = [];
  for (const p of INITIAL_POSTS) {
    if (removed.has(p.id)) continue;
    merged.push(userById.get(p.id) ?? p);
  }
  // mock 에 없던 새 글 (사용자 작성) 은 그대로 추가.
  for (const p of userPosts) {
    if (!INITIAL_POSTS.some((m) => m.id === p.id)) merged.push(p);
  }
  return sortByRecency(merged);
}

let _posts: Post[] = buildInitial();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const postsStore = {
  getPosts(): Post[] {
    return _posts;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /**
   * 새 글 추가. 추가 후 항상 최신순(timeAgo 분 단위 오름차순)으로 재정렬.
   * 시드 계정에서 여러 글이 연속 prepend 돼도 timeAgo 기준으로 올바르게 노출됨.
   */
  prepend(post: Post): void {
    _posts = sortByRecency([post, ..._posts]);
    persist();
    notify();
  },
  update(post: Post): void {
    const idx = _posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      const next = [..._posts];
      next[idx] = post;
      // timeAgo 가 바뀌었을 수도 있으니 업데이트 후에도 재정렬
      _posts = sortByRecency(next);
      persist();
      notify();
    }
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    _posts = _posts.filter((p) => !set.has(p.id));
    persist();
    notify();
  },
  /** 신규 가입 시 게시글을 mock 초기값으로 되돌림 (테스트 계정이 prepend 한 글 제거) */
  resetToInitial(): void {
    _posts = sortByRecency(INITIAL_POSTS);
    // 영속화된 사용자 변경분도 같이 비움
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    notify();
  },
};
