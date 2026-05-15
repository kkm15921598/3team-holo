import { useSyncExternalStore } from "react";

/**
 * 사용자가 board-detail 에서 작성한 댓글 / 대댓글을 영속화하는 store.
 *
 * - mock 의 POST_COMMENTS / COMMENTS 와 합쳐서 화면에 노출된다.
 * - 페이지를 떠났다 돌아와도 작성한 댓글은 유지된다.
 * - 마이페이지 "내가 쓴 댓글" 화면에서 댓글을 단 게시글 목록을 보여주는 데도 사용.
 */

export type StoredComment = {
  id: string;
  postId: string;
  nickname: string;
  content: string;
  timeAgo: string;
  /** 대댓글이면 부모 댓글의 id, 일반 댓글이면 undefined */
  parentId?: string;
  isAuthor?: boolean;
  hasMap?: boolean;
  hasPhoto?: boolean;
};

const STORAGE_KEY = "holo:comments:v1";

function loadInitial(): StoredComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as StoredComment[];
    }
  } catch {
    // ignore
  }
  return [];
}

let state: StoredComment[] = loadInitial();
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

export function addComment(c: StoredComment): void {
  state = [...state, c];
  persist();
  emit();
}

/** postId 들에 해당하는 사용자 댓글 전부 제거 (마이페이지 관리 화면용) */
export function removeCommentsByPostIds(postIds: string[]): void {
  const set = new Set(postIds);
  state = state.filter((c) => !set.has(c.postId));
  persist();
  emit();
}

export function getCommentsForPost(postId: string): StoredComment[] {
  return state.filter((c) => c.postId === postId);
}

/** 사용자가 댓글을 단 적이 있는 postId 들 */
export function getCommentedPostIds(): string[] {
  const set = new Set(state.map((c) => c.postId));
  return [...set];
}

/** 해당 postId 에 사용자가 단 댓글 수 (대댓글 포함) */
export function getUserCommentCount(postId: string): number {
  return state.filter((c) => c.postId === postId).length;
}

/** 사용자 댓글 전체 교체 — 테스트 계정 시드 시 사용 */
export function setComments(list: StoredComment[]): void {
  state = [...list];
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

/** 전체 사용자 댓글 배열 (드물게 필요) */
export function useUserComments(): StoredComment[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
