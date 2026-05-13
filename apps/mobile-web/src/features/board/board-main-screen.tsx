import { Link } from "react-router-dom";
import { BOARD_CATEGORIES } from "@/shared/mock/data";

export function BoardMainScreen() {
  // Hide the "전체" pseudo-tab from the grid here — it remains available
  // via the "게시판" text below, which navigates to the full Board2 list.
  const visibleCategories = BOARD_CATEGORIES.filter((c) => c.id !== "all");

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-2 pb-4">
      {/* 실시간 TOP */}
      <Link
        to="/board/list"
        className="flex h-[110px] items-center justify-between rounded-[15px] border border-holo-top-live-bd bg-holo-top-live-bg px-5"
      >
        <div>
          <p className="text-[16px] font-bold text-holo-ink">실시간 TOP</p>
          <p className="mt-1 text-[12px] text-holo-error">지금 이 순간 가장 뜨거운 글</p>
        </div>
        <span className="flex h-[80px] w-[80px] items-center justify-center text-[28px]">⚡</span>
      </Link>

      {/* 주간 TOP */}
      <Link
        to="/board/list"
        className="flex h-[110px] items-center justify-between rounded-[15px] border border-holo-lilac-deep bg-holo-lilac-card px-5"
      >
        <div>
          <p className="text-[16px] font-bold text-holo-ink">주간 TOP</p>
          <p className="mt-1 text-[12px] text-holo-purple-mid">이번 주 가장 많이 본 글</p>
        </div>
        <span className="flex h-[80px] w-[80px] items-center justify-center text-[28px]">🏆</span>
      </Link>

      {/* 게시판 카테고리 */}
      <section className="flex-1 rounded-[15px] border border-holo-line-2 bg-white p-5">
        {/* "게시판" header → Board2 with 전체 active */}
        <Link
          to="/board/list"
          className="inline-block text-[16px] font-bold text-holo-ink"
        >
          게시판
        </Link>
        <p className="mt-1 text-[12px] text-holo-ink-3">
          우리 동네 이야기를
          <br />
          나눠보세요
        </p>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {visibleCategories.map((c) => (
            <Link
              key={c.id}
              to="/board/list"
              className="flex items-center gap-2 text-[13px] text-holo-ink"
            >
              <CategoryIcon id={c.id} />
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAB */}
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

function CategoryIcon({ id }: { id: string }) {
  const map: Record<string, string> = {
    free: "📝",
    share: "🛒",
    recommend: "👍",
    game: "🎮",
    sport: "🤝",
    media: "📺",
    food: "🍴",
    help: "🆘",
  };
  return <span className="text-[16px] text-holo-purple-mid">{map[id] ?? "•"}</span>;
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
