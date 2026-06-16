import { useState } from "react";
import {
  addOnelineNews,
  removeOnelineNews,
  useOnelineNews,
} from "./oneline-store";
import { isMyNickname } from "@/shared/stores/profile-store";
import { requireAuth } from "@/shared/lib/guest-gate";

/** "방금/N분 전/N시간 전" 짧은 경과 표기 */
function ago(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

/**
 * 홈 상단 "동네 한 줄 소식" — 이웃들의 짧은 휘발성 소식 카드 리스트 + 작성 입력.
 * 게시판 글보다 가벼운 진입(한 줄)으로 참여·재방문을 유도한다.
 */
export function OnelineTicker() {
  const news = useOnelineNews();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!requireAuth()) return;
    const v = draft.trim();
    if (!v) return;
    addOnelineNews(v);
    setDraft("");
    setOpen(false);
  };

  return (
    <section className="mt-[68px] px-[14px]">
      <div className="mb-[10px] flex items-center justify-between">
        <div className="flex items-center gap-[6px] text-[18px]">
          <CampaignIcon />
          <span className="font-bold text-holo-purple-mid">동네 한 줄 소식</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-holo-lilac-card-2 px-3 py-1 text-[13px] font-semibold text-holo-purple-mid transition active:scale-95"
        >
          {open ? "닫기" : "+ 소식 남기기"}
        </button>
      </div>

      {/* 작성 입력 — 한 줄, 최대 60자 */}
      {open && (
        <div className="mb-[10px] flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 60))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="이웃에게 한 줄 소식을 남겨보세요 (예: 놀이터 분실물 있어요)"
            maxLength={60}
            autoFocus
            className="h-[42px] min-w-0 flex-1 rounded-[12px] border border-holo-line bg-white px-3 text-[14px] outline-none placeholder:text-[12px] placeholder:text-holo-ink-3 focus:border-holo-purple-mid"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className={`h-[42px] shrink-0 rounded-[12px] px-4 text-[14px] font-semibold text-white transition ${
              draft.trim() ? "bg-holo-purple-mid active:scale-95" : "bg-holo-ink-4"
            }`}
          >
            남기기
          </button>
        </div>
      )}

      {news.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-[58px] w-full items-center justify-center gap-1 rounded-[16px] bg-holo-surface text-[13px] text-holo-ink-3"
        >
          아직 동네 소식이 없어요 — <span className="font-semibold text-holo-purple-mid">첫 소식을 남겨보세요!</span>
        </button>
      ) : (
        // 가로 스크롤 카드 — 최신 소식이 왼쪽부터.
        <div className="no-scrollbar -mx-[14px] flex gap-2 overflow-x-auto px-[14px] pb-1">
          {news.map((n) => {
            const mine = isMyNickname(n.nickname);
            return (
              <div
                key={n.id}
                className="relative flex w-[200px] shrink-0 flex-col justify-between rounded-[14px] border border-holo-line bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(116,72,221,0.06)]"
              >
                <p className="line-clamp-2 break-keep text-[13px] leading-snug text-holo-ink">
                  {n.content}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-holo-ink-3">
                  <span className="truncate">{n.nickname}</span>
                  <span className="ml-1 shrink-0">{ago(n.createdAt)}</span>
                </div>
                {mine && (
                  <button
                    type="button"
                    aria-label="내 소식 삭제"
                    onClick={() => removeOnelineNews(n.id)}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-holo-surface-2 text-[11px] text-holo-ink-3 transition active:scale-90"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * 확성기(campaign) 라인 아이콘 — 홀로 보라 톤의 stroke 스타일.
 * (오로라: 채워진 아이콘보다 라인 아이콘이 헤더 텍스트와 톤이 맞고 가벼워 가독성↑)
 */
function CampaignIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7448DD"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 3.5V7.5L6 11H4a1 1 0 0 0-1 0z" />
      <path d="M9.5 7.5 18 4v16l-8.5-3.5" />
      <path d="M21 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}
