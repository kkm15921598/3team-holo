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
        className="relative flex h-[110px] items-center justify-between overflow-hidden rounded-[20px] border border-holo-top-live-bd bg-holo-top-live-bg pl-5 pr-3"
      >
        <div>
          <p className="text-[18px] font-bold text-holo-ink">실시간 TOP</p>
          <p className="mt-1 text-[12px] text-holo-error">
            지금 이 순간 가장 뜨거운 글
          </p>
        </div>
        <img
          src="/illustrations/board/board_top_live.png"
          alt=""
          aria-hidden
          className="h-[90px] w-auto object-contain"
        />
      </Link>

      {/* 주간 TOP */}
      <Link
        to="/board/list"
        className="relative flex h-[110px] items-center justify-between overflow-hidden rounded-[20px] border border-holo-lilac-deep bg-holo-lilac-card pl-5 pr-3"
      >
        <div>
          <p className="text-[18px] font-bold text-holo-ink">주간 TOP</p>
          <p className="mt-1 text-[12px] text-holo-purple-mid">
            이번 주 가장 많이 본 글
          </p>
        </div>
        <img
          src="/illustrations/board/board_top_weekly.png"
          alt=""
          aria-hidden
          className="h-[90px] w-auto object-contain"
        />
      </Link>

      {/* 게시판 카테고리 */}
      <section className="relative flex-1 overflow-hidden rounded-[20px] border border-holo-line-2 bg-white p-5">
        {/* 상단 영역 — 좌측 텍스트 + 우측 일러스트 (높이 고정으로 그리드와 분리) */}
        <div className="relative h-[180px]">
          <div className="relative z-10">
            <Link
              to="/board/list"
              className="inline-block text-[18px] font-bold text-holo-ink"
            >
              게시판
            </Link>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              우리 동네 이야기를
              <br />
              나눠보세요
            </p>
          </div>
          <img
            src="/illustrations/board/board_section_illustration.png"
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute -right-5 -top-1 z-0 h-[200px] w-auto select-none object-contain"
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
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
