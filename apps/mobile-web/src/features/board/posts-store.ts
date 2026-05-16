// Module-level posts store. Initial data comes from the mock POSTS array.
// New posts published from Board5 are prepended via `prepend` and consumed
// reactively by Board2 (board-list-screen) through `subscribe`.

import { POSTS as INITIAL_POSTS, type Post } from "@/shared/mock/data";

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

let _posts: Post[] = sortByRecency(INITIAL_POSTS);
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
    notify();
  },
  update(post: Post): void {
    const idx = _posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      const next = [..._posts];
      next[idx] = post;
      // timeAgo 가 바뀌었을 수도 있으니 업데이트 후에도 재정렬
      _posts = sortByRecency(next);
      notify();
    }
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    _posts = _posts.filter((p) => !set.has(p.id));
    notify();
  },
};
