import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "./managed-list";
import {
  removeCommentsByPostIds,
  useUserComments,
} from "@/shared/stores/comments-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/** ISO 시간 → 상대 시간 표현 */
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function MyCommentsScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const userComments = useUserComments();

  // Supabase에서 내가 단 댓글의 post_id, created_at 조회 (다른 기기에서 작성한 것 포함)
  const [supabaseCommentMeta, setSupabaseCommentMeta] = useState<
    { postId: string; createdAt: string }[]
  >([]);
  useEffect(() => {
    // 전화번호(user_id, 안정 식별자)로 조회 — 닉네임을 바꿔도 옛 닉네임으로 단 댓글까지
    // 모두 잡힌다(닉네임으로 조회하면 변경 후 옛 댓글이 누락됐다). user_id 컬럼은 이미 존재.
    const userPhone = getCurrentAccount();
    if (!userPhone) return;
    supabase
      .from("comments")
      .select("post_id, created_at")
      .eq("user_id", userPhone)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSupabaseCommentMeta(
            data.map((row: any) => ({
              postId: String(row.post_id),
              createdAt: row.created_at ?? "",
            })),
          );
        }
      });
  }, []);

  // 사용자가 댓글을 단 적이 있는 게시글만 노출
  // localStorage(optimistic) + Supabase 합산, 중복 제거
  const items = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];

    // localStorage (optimistic, 최신순)
    for (let i = userComments.length - 1; i >= 0; i--) {
      const id = userComments[i].postId;
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    // Supabase (이미 최신순으로 정렬됨, localStorage에 없는 것만 추가)
    for (const row of supabaseCommentMeta) {
      if (!seen.has(row.postId)) {
        seen.add(row.postId);
        ids.push(row.postId);
      }
    }

    return ids
      .map((id) => postsStore.getPosts().find((p) => p.id === id))
      .filter((p): p is Post => !!p);
  }, [userComments, supabaseCommentMeta]);

  // 각 게시글에서 가장 최근 댓글 시간
  const latestCommentTimeById = useMemo(() => {
    const m = new Map<string, string>();
    // Supabase 먼저 (최신순 정렬된 상태)
    for (const row of supabaseCommentMeta) {
      if (!m.has(row.postId) && row.createdAt)
        m.set(row.postId, relativeTime(row.createdAt));
    }
    // localStorage 덮어쓰기 (가장 최신 댓글 기준)
    for (let i = userComments.length - 1; i >= 0; i--) {
      const c = userComments[i];
      if (!m.has(c.postId)) m.set(c.postId, c.timeAgo);
    }
    return m;
  }, [userComments, supabaseCommentMeta]);

  const getTimeLabel = (p: Post): string | undefined =>
    latestCommentTimeById.get(p.id);

  const handleDelete = (ids: string[]) => {
    // 로컬 store + 화면 상태(supabaseCommentMeta) + 원격 댓글 3곳 모두 정리.
    // (이전엔 로컬 store 만 비워, Supabase 에 남은 내 댓글이 재진입/재계산 시 부활했다.)
    removeCommentsByPostIds(ids);
    setSupabaseCommentMeta((prev) => prev.filter((m) => !ids.includes(m.postId)));
    const userPhone = getCurrentAccount();
    if (userPhone && ids.length > 0) {
      // user_id(전화번호)로 삭제 — 닉네임 변경 후 옛 닉네임으로 단 댓글도 확실히 삭제.
      supabase
        .from("comments")
        .delete()
        .eq("user_id", userPhone)
        .in("post_id", ids)
        .then(({ error }) => {
          if (error) console.warn("Supabase 댓글 삭제 실패:", error.message);
        });
    }
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
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
