import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { POSTS } from "@/shared/mock/data";
import { ManagedList } from "./managed-list";
import { setPostLiked, useLikedSet } from "@/shared/stores/likes-store";

export function LikesScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const likedSet = useLikedSet();

  // store 의 liked id set 으로 실제 좋아요한 게시글만 노출
  const items = useMemo(
    () => POSTS.filter((p) => likedSet.has(p.id)),
    [likedSet],
  );

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
