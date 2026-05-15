import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { useJoinedSet } from "@/shared/stores/joined-store";

export function MyMeetingsScreen() {
  const navigate = useNavigate();
  const joinedSet = useJoinedSet();
  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());

  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  // 사용자가 참여한 게시글만 추출
  const myMeetings = useMemo(
    () => allPosts.filter((p) => joinedSet.has(p.id)),
    [allPosts, joinedSet],
  );

  return (
    <main className="flex flex-1 flex-col overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">모임 참여</span>
        <span className="ml-auto text-[13px] text-holo-ink-3">총 {myMeetings.length}개</span>
      </header>

      <section className="mt-1 flex flex-col gap-3 px-4">
        {myMeetings.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-[40px]">🤝</span>
            <p className="text-[15px] font-semibold text-holo-ink">참여한 모임이 없어요</p>
            <p className="text-[13px] text-holo-ink-3">이웃들과 함께하는 모임을 찾아보세요!</p>
          </div>
        ) : (
          myMeetings.map((post) => (
            <Link
              key={post.id}
              to={`/board/${post.id}`}
              className="block rounded-[14px] border border-holo-line bg-white p-4 active:bg-holo-surface-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <span className="truncate text-[15px] font-semibold text-holo-ink">
                    {post.title}
                  </span>
                  <span className="line-clamp-1 text-[12px] text-holo-ink-3">
                    {post.description}
                  </span>
                </div>
                {post.peopleCount != null && (
                  <span className="shrink-0 rounded-full bg-holo-purple-mid/10 px-2.5 py-1 text-[11px] font-semibold text-holo-purple-mid">
                    {post.peopleCount}명
                  </span>
                )}
              </div>

              {(post.eventDate || post.place) && (
                <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-holo-surface-2 px-3 py-2">
                  {post.eventDate && (
                    <>
                      <CalendarIcon />
                      <span className="text-[12px] text-holo-ink-3">
                        {post.eventDate}
                      </span>
                    </>
                  )}
                  {post.eventDate && post.place && (
                    <span className="mx-1 h-3 w-px bg-holo-line" />
                  )}
                  {post.place && (
                    <span className="truncate text-[12px] text-holo-ink-3">
                      {post.place}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] text-holo-ink-3">
                  {post.authorNickname} · {post.timeAgo}
                </span>
                <span className="text-[11px] font-semibold text-holo-purple-mid">
                  참여중
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
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

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
