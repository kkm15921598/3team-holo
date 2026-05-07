import { useNavigate, useParams } from "react-router-dom";
import { POSTS, COMMENTS } from "@/shared/mock/data";
import { StatusBadge } from "./board-list-screen";

export function BoardDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const post = POSTS.find((p) => p.id === id) ?? POSTS[0];

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </header>

      <article className="mx-4 flex flex-1 flex-col rounded-t-holo-card border border-holo-lilac-soft bg-white p-4">
        {/* author */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-holo-yellow-room" />
          <span className="rounded-[4px] bg-holo-gradient px-2 py-0.5 text-[11px] font-semibold text-white">
            Lv.{post.authorLevel}
          </span>
          <span className="text-[14px] font-semibold text-holo-ink">{post.authorNickname}</span>
        </div>
        <div className="mt-3 h-px w-full bg-holo-surface-3" />

        {/* title + status */}
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={post.status} />
          <span className="text-[16px] font-semibold text-holo-ink">{post.title}</span>
        </div>
        <p className="mt-1 text-[13px] text-holo-ink-2">{post.description}</p>
        <div className="mt-2 flex items-center gap-4 text-[12px] text-holo-ink-3">
          <span className="flex items-center gap-1">
            <HeartIcon /> {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <CommentIcon /> {post.comments}
          </span>
          <span className="ml-auto">{post.timeAgo}</span>
        </div>

        {/* map */}
        <img
          src="/illustrations/map.png"
          alt="모임 위치"
          className="mt-3 h-[120px] w-full rounded-[10px] border border-holo-line-2 object-cover"
        />

        <div className="mt-3 h-px w-full bg-holo-surface-3" />

        {/* comments */}
        <ul className="mt-3 flex flex-col gap-3">
          {COMMENTS.map((c) => (
            <li key={c.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-holo-ink">{c.nickname}</span>
                <span className="text-[11px] text-holo-ink-3">{c.timeAgo}</span>
              </div>
              <p className="text-[13px] text-holo-ink-2">{c.content}</p>
            </li>
          ))}
        </ul>

        {/* comment input */}
        <form
          className="mt-auto flex items-center gap-2 pt-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="text"
            placeholder="댓글 작성하기"
            className="h-[34px] flex-1 rounded-full border border-holo-line-3 bg-white px-4 text-[13px] outline-none placeholder:text-holo-ink-3"
          />
          <button type="submit" aria-label="전송" className="text-holo-ink-4">
            <SendIcon />
          </button>
        </form>
      </article>
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
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
