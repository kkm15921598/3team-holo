import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { POST_COMMENTS, type Post } from "@/shared/mock/data";
import { useLikedSet } from "@/shared/stores/likes-store";
import { useUserComments } from "@/shared/stores/comments-store";

/**
 * 카테고리별 라벨 + 컬러 토큰.
 *  - `tint` 는 카테고리 칩의 배경 색 (라이트 파스텔)
 *  - `text` 는 칩 안 글자 색 (진한 동계열)
 *  - 마이페이지의 컬러 통계 타일과 동일한 톤으로 통일.
 */
const CATEGORY_META: Record<
  string,
  { label: string; tint: string; text: string }
> = {
  food: { label: "맛집", tint: "bg-[#FFE7D6]", text: "text-[#C97A1F]" },
  share: { label: "소분", tint: "bg-[#E2EEFF]", text: "text-[#4471D8]" },
  recommend: { label: "추천", tint: "bg-[#FFE7F0]", text: "text-[#D6488A]" },
  game: { label: "게임", tint: "bg-[#EFE5FF]", text: "text-holo-purple-mid" },
  sport: { label: "운동", tint: "bg-[#DCF3E3]", text: "text-[#2E9B5A]" },
  media: { label: "영화", tint: "bg-[#FFE5F4]", text: "text-[#B3478A]" },
  help: { label: "도움", tint: "bg-[#FFF0DA]", text: "text-[#C97A1F]" },
  free: { label: "자유", tint: "bg-[#EAEAFD]", text: "text-[#5B5BD6]" },
};

const FALLBACK_META = {
  label: "기타",
  tint: "bg-holo-line-3",
  text: "text-holo-ink-3",
};

export function ManagedList({
  title,
  manage,
  onToggleManage,
  items,
  onDelete,
  readOnly = false,
  getTimeLabel,
}: {
  title: string;
  manage: boolean;
  onToggleManage: () => void;
  items: Post[];
  onDelete: (ids: string[]) => void;
  /** 읽기 전용 — 다른 사용자의 글/댓글을 볼 때처럼 "관리하기" 버튼을 숨김 */
  readOnly?: boolean;
  /**
   * 메타 행 우측 시간 라벨을 화면별로 다르게 표시하기 위한 콜백.
   *  - 내 글 → 작성 시점 (p.timeAgo 기본)
   *  - 내 댓글 → 마지막 댓글 시점
   *  - 최근 본 글 → 본 시점
   *  - 좋아요 → 좋아요 누른 시점 (없으면 작성 시점)
   * 반환값이 falsy 면 p.timeAgo 폴백.
   */
  getTimeLabel?: (post: Post) => string | undefined;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const likedSet = useLikedSet();
  const userComments = useUserComments();

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    onDelete(Array.from(selected));
    setSelected(new Set());
    onToggleManage();
  };

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((p) => p.id)));
  };

  return (
    <>
      {/* 상단 요약 영역 — 헤더와 동일하게 흰색 톤 유지 (다른 mypage 하위 화면과 통일). */}
      <section className="border-b border-holo-line-3 bg-white px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[15px] font-bold text-holo-ink">{title}</span>
            <span className="text-[13px] font-semibold text-holo-purple-mid">
              {items.length}
            </span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {/* 관리 모드일 때만 "삭제하기" 가 추가로 나옴. 0개 선택 시 비활성. */}
              {manage && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={selected.size === 0}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    selected.size === 0
                      ? "border border-holo-line bg-white text-holo-ink-4"
                      : "bg-holo-error text-white"
                  }`}
                >
                  {selected.size > 0
                    ? `${selected.size}개 삭제`
                    : "삭제하기"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (manage) {
                    setSelected(new Set());
                  }
                  onToggleManage();
                }}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  manage
                    ? "bg-holo-ink text-white"
                    : "border border-holo-purple-mid bg-white text-holo-purple-mid"
                }`}
              >
                {manage ? "완료" : "관리하기"}
              </button>
            </div>
          )}
        </div>
        {/* 관리 모드일 때 안내 + 전체 선택 토글 */}
        {!readOnly && manage && items.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-holo-input bg-holo-surface-2 px-3 py-2">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-[13px] text-holo-ink"
            >
              <CheckBox checked={allSelected} />
              {allSelected ? "전체 해제" : "전체 선택"}
            </button>
            <span className="text-[12px] text-holo-ink-3">
              {selected.size}개 선택됨
            </span>
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-holo-lilac-soft text-holo-purple-mid">
            <EmptyIcon />
          </span>
          <p className="text-[14px] font-medium text-holo-ink">
            아직 비어있어요
          </p>
          <p className="text-[12px] leading-relaxed text-holo-ink-3">
            활동을 시작하면 이곳에 모이게 돼요.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-3 pb-4">
          {items.map((p) => {
            const meta = CATEGORY_META[p.category] ?? FALLBACK_META;
            const on = selected.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (manage) {
                      toggle(p.id);
                    } else {
                      navigate(`/board/${p.id}`);
                    }
                  }}
                  className={`relative flex w-full items-start gap-3 rounded-[14px] bg-white p-4 text-left shadow-holo-card transition ${
                    manage && on ? "ring-2 ring-holo-purple-mid" : ""
                  } active:scale-[0.99]`}
                >
                  {/* 관리 모드면 좌측 체크박스, 아니면 카테고리 칩 */}
                  {manage ? (
                    <span className="mt-0.5 shrink-0">
                      <CheckBox checked={on} />
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold ${meta.tint} ${meta.text}`}
                    >
                      {meta.label}
                    </span>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-holo-ink">
                      {p.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[13px] text-holo-ink-3">
                      {p.description || "내용이 없습니다."}
                    </span>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-holo-ink-3">
                      {/* ❤️ 좋아요 — 사용자가 누른 경우 +1 반영 */}
                      <span className="inline-flex items-center gap-1">
                        <HeartIcon /> {p.likes + (likedSet.has(p.id) ? 1 : 0)}
                      </span>
                      <span className="h-0.5 w-0.5 rounded-full bg-holo-line-2" />
                      {/* 💬 댓글 — mock POST_COMMENTS + 사용자가 단 댓글 합산 */}
                      <span className="inline-flex items-center gap-1">
                        <ChatBubbleIcon />{" "}
                        {(POST_COMMENTS[p.id]?.length ?? 0) +
                          userComments.filter((c) => c.postId === p.id).length}
                      </span>
                      <span className="h-0.5 w-0.5 rounded-full bg-holo-line-2" />
                      <span>{getTimeLabel?.(p) || p.timeAgo}</span>
                    </div>
                  </div>

                  {!manage && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-holo-lilac-light text-white">
                      <ArrowChip />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

    </>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border-2 transition ${
        checked
          ? "border-holo-purple-mid bg-holo-purple-mid"
          : "border-holo-line bg-white"
      }`}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function ArrowChip() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#FF9AB8" stroke="#FF9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C7BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </svg>
  );
}
