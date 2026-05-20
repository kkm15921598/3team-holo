import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "@/features/mypage/managed-list";
import { supabase } from "@/shared/lib/supabaseClient";

/**
 * 친구가 댓글을 단 게시글 목록.
 * Supabase comments 테이블에서 nickname 으로 댓글을 단 글 id 를 모은 뒤,
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

  // Supabase에서 해당 닉네임이 댓글 단 post_id 목록 조회
  const [commentPostIds, setCommentPostIds] = useState<string[]>([]);
  useEffect(() => {
    if (!nickname) return;
    supabase
      .from("comments")
      .select("post_id")
      .eq("nickname", nickname)
      .then(({ data }) => {
        if (data) {
          const ids = [...new Set(data.map((row: any) => String(row.post_id)))];
          setCommentPostIds(ids);
        }
      });
  }, [nickname]);

  const items = useMemo(() => {
    if (!nickname || commentPostIds.length === 0) return [];
    return commentPostIds
      .map((pid) => allPosts.find((p) => p.id === pid))
      .filter((p): p is Post => !!p);
  }, [nickname, allPosts, commentPostIds]);

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
