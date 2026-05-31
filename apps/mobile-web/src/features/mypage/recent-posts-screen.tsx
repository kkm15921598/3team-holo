import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { ManagedList } from "./managed-list";
import {
  removeViewedPosts,
  useViewedEntries,
} from "@/shared/stores/viewed-posts-store";

/** unix ms 타임스탬프 → "방금 전 / X분 전 / X시간 전 / X일 전" 같은 상대 시간. */
function timeAgoFromMs(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}주 전`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}

export function RecentPostsScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const viewedEntries = useViewedEntries();

  // store 의 viewed 엔트리(최근순)에 해당하는 게시글만 노출.
  const items = useMemo(
    () =>
      viewedEntries
        .map((e) => postsStore.getPosts().find((p) => p.id === e.id))
        .filter((p): p is Post => !!p),
    [viewedEntries],
  );

  // 게시글 id → 본 시점 timestamp 매핑 — 메타 행의 시간 라벨 계산에 사용.
  const viewedAtById = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of viewedEntries) m.set(e.id, e.viewedAt);
    return m;
  }, [viewedEntries]);

  const getTimeLabel = (p: Post): string | undefined => {
    const at = viewedAtById.get(p.id);
    return at != null ? timeAgoFromMs(at) : undefined;
  };

  const handleDelete = (ids: string[]) => {
    removeViewedPosts(ids);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
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
