import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "./managed-list";
import {
  removeCommentsByPostIds,
  useUserComments,
} from "@/shared/stores/comments-store";

export function MyCommentsScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const userComments = useUserComments();

  // 사용자가 댓글을 단 적이 있는 게시글만 노출 — store 의 댓글 작성 시점 순서 유지
  const items = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (let i = userComments.length - 1; i >= 0; i--) {
      const id = userComments[i].postId;
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids
      .map((id) => postsStore.getPosts().find((p) => p.id === id))
      .filter((p): p is Post => !!p);
  }, [userComments]);

  // 각 게시글에서 사용자가 가장 최근에 단 댓글의 timeAgo — 메타 행 시간 라벨.
  // 사용자 댓글 배열의 끝쪽이 최신이므로 뒤에서부터 처음 매칭되는 항목을 사용.
  const latestCommentTimeById = useMemo(() => {
    const m = new Map<string, string>();
    for (let i = userComments.length - 1; i >= 0; i--) {
      const c = userComments[i];
      if (!m.has(c.postId)) m.set(c.postId, c.timeAgo);
    }
    return m;
  }, [userComments]);

  const getTimeLabel = (p: Post): string | undefined =>
    latestCommentTimeById.get(p.id);

  const handleDelete = (ids: string[]) => {
    removeCommentsByPostIds(ids);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">내가 쓴 댓글</span>
      </header>
      <ManagedList
        title="내가 쓴 댓글"
        manage={manage}
        onToggleManage={() => setManage((v) => !v)}
        items={items}
        onDelete={handleDelete}
        getTimeLabel={getTimeLabel}
      />
    </main>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
