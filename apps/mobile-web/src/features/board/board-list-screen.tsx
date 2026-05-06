import { Link } from "react-router-dom";
import { useState } from "react";
import { BOARD_CATEGORIES, POSTS } from "@/shared/mock/data";

export function BoardListScreen() {
  const [activeCat, setActiveCat] = useState<string>("free");

  return (
    <main className="flex flex-1 flex-col">
      {/* Category tabs */}
      <div className="-mx-0 overflow-x-auto border-b border-holo-line px-4 py-2">
        <div className="flex w-max gap-2">
          {BOARD_CATEGORIES.map((c) => {
            const on = activeCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[13px] ${
                  on ? "bg-holo-lilac-card text-holo-purple-mid" : "text-holo-ink-3"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts */}
      <ul className="flex-1 overflow-y-auto">
        {POSTS.map((p) => (
          <li key={p.id} className="border-b border-holo-line">
            <Link to={`/board/${p.id}`} className="flex gap-3 px-4 py-3">
              <div className="h-16 w-16 shrink-0 rounded bg-holo-line-3" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="text-[15px] font-semibold text-holo-ink">{p.title}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-[13px] text-holo-ink-3">{p.description}</p>
                <div className="mt-2 flex items-center gap-4 text-[12px] text-holo-ink-3">
                  <span className="flex items-center gap-1">
                    <HeartIcon /> {p.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <CommentIcon /> {p.comments}
                  </span>
                  <span className="ml-auto">{p.timeAgo}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

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

export function StatusBadge({ status }: { status: "모집중" | "모집완료" }) {
  const styles =
    status === "모집중"
      ? "bg-holo-success text-[#3F7E25]"
      : "bg-holo-full text-[#C53030]";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${styles}`}>{status}</span>
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
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
