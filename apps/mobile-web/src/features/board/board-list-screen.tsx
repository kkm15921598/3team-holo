import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_CATEGORIES,
  CATEGORY_SHORT,
  type Post,
} from "@/shared/mock/data";
import { postsStore } from "./posts-store";

const DRAG_THRESHOLD = 4;

export function BoardListScreen() {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [posts, setPosts] = useState<Post[]>(postsStore.getPosts());

  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);

  const tabsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tabsRef.current) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: tabsRef.current.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !tabsRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
      tabsRef.current.scrollLeft = dragRef.current.startScroll - dx;
    }
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const handleTabClick = (catId: string) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setActiveCat(catId);
  };

  const visible =
    activeCat === "all" ? posts : posts.filter((p) => p.category === activeCat);

  return (
    <main className="flex flex-1 flex-col">
      <div
        ref={tabsRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="overflow-x-auto border-b border-holo-line px-4 py-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: "grab" }}
      >
        <div className="flex w-max gap-2">
          {BOARD_CATEGORIES.map((c) => {
            const on = activeCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleTabClick(c.id)}
                className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[16px] font-medium ${
                  on ? "bg-holo-lilac-card text-holo-purple-mid" : "text-holo-ink-3"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-holo-ink-3">
          게시글이 없습니다.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {visible.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </ul>
      )}

      <Link
        to="/board/write"
        aria-label="글쓰기"
        className="fixed bottom-[88px] right-1/2 z-10 flex h-[50px] w-[50px] translate-x-[160px] items-center justify-center rounded-full bg-holo-gradient text-white shadow-md"
      >
        <PlusIcon />
      </Link>
    </main>
  );
}

function PostCard({ post }: { post: Post }) {
  // Status block under avatar appears for every category EXCEPT 추천해요.
  const showStatusBlock = post.category !== "recommend";
  // Category badge before the title appears ONLY on 자유게시판 posts.
  const showCategoryBadge = post.category === "free";

  const cap = post.peopleCount ?? 5;
  const joined = post.status === "모집완료" ? cap : Math.max(1, cap - 2);
  const shortLabel = CATEGORY_SHORT[post.category] ?? "";

  return (
    <li className="border-b border-holo-line">
      <Link to={`/board/${post.id}`} className="flex items-start gap-3 px-4 py-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="h-12 w-12 rounded-full bg-holo-yellow-room" />
          {showStatusBlock && (
            <>
              <StatusText status={post.status} />
              <FractionPill status={post.status} text={`${joined}/${cap}`} />
            </>
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            {showCategoryBadge && shortLabel && (
              <CategoryBadge label={shortLabel} />
            )}
            <span className="text-[15px] font-semibold text-holo-ink">
              {post.title}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[13px] text-holo-ink-3">
            {post.description}
          </p>
          <p className="mt-1 text-[11px] text-holo-ink-3">
            {post.authorNickname} · {post.timeAgo}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-holo-ink-3">
            <span className="flex items-center gap-1">
              <HeartIcon /> {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <CommentIcon /> {post.comments}
            </span>
          </div>
        </div>
        <ChevronRight />
      </Link>
    </li>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-[4px] bg-holo-lilac-soft px-1.5 py-0.5 text-[11px] font-medium text-holo-purple-mid">
      {label}
    </span>
  );
}

/** 모집중/모집완료 as plain text — no pill background, #000000. */
export function StatusBadge({ status }: { status: "모집중" | "모집완료" }) {
  return (
    <span className="text-[12px] font-medium text-[#000000]">{status}</span>
  );
}

function StatusText({ status }: { status: "모집중" | "모집완료" }) {
  return (
    <span className="text-[11px] font-medium text-[#000000]">{status}</span>
  );
}

function FractionPill({
  status,
  text,
}: {
  status: "모집중" | "모집완료";
  text: string;
}) {
  const styles =
    status === "모집중"
      ? "bg-holo-success text-[#3F7E25]"
      : "bg-holo-full text-[#C53030]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles}`}>
      {text}
    </span>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-2 self-center">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
