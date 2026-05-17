import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "@/features/mypage/managed-list";

/**
 * 친구가 작성한 게시글 목록.
 * URL 파라미터 nickname 으로 작성자를 식별하고, postsStore 에서 해당 닉네임으로 작성된 글을 노출.
 * 읽기 전용 — "관리하기" 버튼은 숨김.
 */
export function FriendPostsScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const nickname = id ? decodeURIComponent(id) : "";

  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());
  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  const items = useMemo(
    () => allPosts.filter((p) => p.authorNickname === nickname),
    [allPosts, nickname],
  );

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          {nickname}님이 쓴 글
        </span>
      </header>
      <ManagedList
        title={`${nickname}님이 쓴 글`}
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
