import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "@/features/mypage/managed-list";

/**
 * 친구가 댓글을 단 게시글 목록.
 * mock POST_COMMENTS 에서 nickname 으로 댓글을 단 글 id 를 모은 뒤,
 * postsStore 에서 해당 글을 찾아 카드 형태로 노출.
 */
export function FriendCommentsScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const nickname = id ? decodeURIComponent(id) : "";

  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());
  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  const items = useMemo(() => {
    if (!nickname) return [];
    // POST_COMMENTS가 제거되어 mock 댓글 기반 조회 불가.
    // postsStore에서 해당 닉네임이 작성한 게시글만 표시.
    const postIds = new Set<string>();
    // postsStore(최신 글 포함) lookup
    return Array.from(postIds)
      .map((pid) => allPosts.find((p) => p.id === pid))
      .filter((p): p is Post => !!p);
  }, [nickname, allPosts]);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          {nickname}님이 쓴 댓글
        </span>
      </header>
      <ManagedList
        title={`${nickname}님이 쓴 댓글`}
        manage={false}
        onToggleManage={() => undefined}
        items={items}
        onDelete={() => undefined}
        readOnly
      />
    </main>
  );
}

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
