import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { useProfile } from "@/shared/hooks/use-profile";
import { ManagedList } from "./managed-list";

export function MyPostsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [manage, setManage] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());

  // postsStore 의 변경을 구독 — 새 글 등록 / 삭제 시 자동 반영
  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  // 현재 프로필 닉네임으로 작성한 글만 노출
  const items = useMemo(
    () => allPosts.filter((p) => p.authorNickname === profile.nickname),
    [allPosts, profile.nickname],
  );

  const handleDelete = (ids: string[]) => {
    postsStore.remove(ids);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">내가 쓴 글</span>
      </header>
      <ManagedList
        title="내가 쓴 글"
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
