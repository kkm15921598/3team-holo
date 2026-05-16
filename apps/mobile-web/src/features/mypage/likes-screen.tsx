import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { POSTS, type Post } from "@/shared/mock/data";
import { ManagedList } from "./managed-list";
import { setPostLiked, useLikedSet } from "@/shared/stores/likes-store";

export function LikesScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const likedSet = useLikedSet();

  // 좋아요한 게시글 목록 — 최근에 누른 글이 맨 위로 오도록 정렬.
  // likedSet (Set) 의 iteration 순서는 곧 삽입 순서(= 좋아요한 시점 순서, 오래된 → 최근)이므로
  // 역순으로 뒤집어서 최신이 위로 오게 한다.
  // 시드 데이터(setLikedIds(["hm3","hm4",...])) 도 같은 규칙: 배열의 뒤쪽일수록 "최근에 좋아요" 로 노출.
  const items = useMemo(() => {
    const postById = new Map<string, Post>(POSTS.map((p) => [p.id, p]));
    const ordered: Post[] = [];
    // Array.from(set) 으로 삽입 순서 배열 후 reverse — set 자체엔 reverse 가 없음
    const orderedIds = Array.from(likedSet).reverse();
    for (const id of orderedIds) {
      const p = postById.get(id);
      if (p) ordered.push(p);
    }
    return ordered;
  }, [likedSet]);

  // "관리하기" → "삭제" 시 likes-store 에서 해당 id 들을 좋아요 해제
  const handleDelete = (ids: string[]) => {
    ids.forEach((id) => setPostLiked(id, false));
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">좋아요</span>
      </header>
      <ManagedList
        title="내가 누른 좋아요 목록"
        manage={manage}
        onToggleManage={() => setManage((v) => !v)}
        items={items}
        onDelete={handleDelete}
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
