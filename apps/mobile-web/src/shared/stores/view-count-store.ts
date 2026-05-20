/**
 * 게시글 조회수.
 *
 * Supabase posts.views 컬럼이 실제 조회수의 원천.
 * - 상세 화면 진입 시 postsStore.patchViews() 를 통해 Supabase RPC 로 원자적 +1.
 * - 중복 카운트 방지: 같은 세션에서 이미 조회한 post id 는 viewed-posts-store 가 관리.
 * - getTotalViews: post.views 값을 그대로 반환 (가짜 baseline 없음).
 */
import { useSyncExternalStore } from "react";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";

/** 표시용 조회수 — Supabase 에서 로드한 실제 값 */
export function getTotalViews(post: Post): number {
  return post.views ?? 0;
}

/** 상세 화면 진입 시 호출 — postsStore 를 통해 Supabase RPC +1 */
export function incrementViewCount(id: string): void {
  postsStore.patchViews(id);
}

// getSnapshot은 매 호출마다 새 객체를 반환하면 무한 루프가 발생하므로
// postsStore가 notify할 때만 캐시를 교체하고, 그 외에는 같은 참조를 반환한다.
let _viewCache: Record<string, number> = {};
postsStore.subscribe(() => {
  const map: Record<string, number> = {};
  postsStore.getPosts().forEach((p) => {
    map[p.id] = p.views ?? 0;
  });
  _viewCache = map;
});

/** React 컴포넌트용 — postsStore 구독으로 조회수 변경 시 재렌더 트리거 */
export function useViewCounts(): Record<string, number> {
  return useSyncExternalStore(
    (cb) => postsStore.subscribe(cb),
    () => _viewCache,
    () => _viewCache,
  );
}
