import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { POSTS } from "@/shared/mock/data";
import { ManagedList } from "./managed-list";
import {
  removeViewedPosts,
  useViewedEntries,
} from "@/shared/stores/viewed-posts-store";

export function RecentPostsScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const viewedEntries = useViewedEntries();

  // store 의 viewed 엔트리(최근순)에 해당하는 게시글만 노출.
  // 가입 직후엔 비어 있고, 게시글을 누를 때마다 한 줄씩 쌓이며 가장 최근에 본 글이 맨 위로 온다.
  const items = useMemo(
    () =>
      viewedEntries
        .map((e) => POSTS.find((p) => p.id === e.id))
        .filter((p): p is (typeof POSTS)[number] => !!p),
    [viewedEntries],
  );

  const handleDelete = (ids: string[]) => {
    removeViewedPosts(ids);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">최근 본 글</span>
      </header>
      <ManagedList
        title="최근 본 글"
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
