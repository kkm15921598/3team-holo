import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

// 게시판 카테고리(BOARD_CATEGORIES) 와 동일한 8개 그룹으로 정리.
// "전체"는 카테고리가 아니라 모음이므로 제외.
type TagItem = { tag: string };
type TagGroup = { label: string; items: TagItem[] };
// 프로필 편집(관심사 수정)에서도 동일한 목록을 쓰도록 export — 가입과 선택지가 어긋나지 않게.
export const TAG_GROUPS: TagGroup[] = [
  {
    label: "자유게시판",
    items: ["소통", "일상", "반려동물", "자취", "여행", "사진", "패션", "뷰티", "인테리어"].map(
      (t) => ({ tag: t }),
    ),
  },
  {
    label: "공동구매 / 소분하기",
    items: ["공동구매", "소분", "나눔", "무료나눔"].map((t) => ({ tag: t })),
  },
  {
    label: "추천해요",
    items: ["정보공유", "재테크", "꿀팁", "독서", "강의"].map((t) => ({ tag: t })),
  },
  {
    label: "게임파티",
    items: ["게임", "OTT", "보드게임"].map((t) => ({ tag: t })),
  },
  {
    label: "같이 운동해요",
    items: ["운동", "산책", "등산", "캠핑", "러닝", "자전거"].map((t) => ({ tag: t })),
  },
  {
    label: "드라마 · 영화",
    items: ["영화", "드라마", "음악", "웹툰", "책", "공연", "전시"].map((t) => ({ tag: t })),
  },
  {
    label: "맛집 & 먹거리",
    items: ["맛집", "먹거리", "카페", "디저트", "술집", "배달", "홈쿠킹"].map(
      (t) => ({ tag: t }),
    ),
  },
  {
    label: "도와주세요!",
    items: ["도움", "분실물"].map((t) => ({ tag: t })),
  },
];

const CHIP_BASE =
  "inline-flex items-center gap-1 rounded-[20px] border px-3.5 py-1.5 text-[14px] transition";

const RECOMMENDED_MIN = 3;
const HARD_MAX = 10;

export function InterestScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();
  const interests = data.interests;
  const custom = data.customInterest;
  const customTrimmed = custom.trim();

  const selected = new Set(interests);

  const toggle = (tag: string) => {
    if (selected.has(tag)) {
      update(
        "interests",
        interests.filter((t) => t !== tag),
      );
      return;
    }
    if (interests.length >= HARD_MAX) return;
    update("interests", [...interests, tag]);
  };

  const removeTag = (tag: string) =>
    update("interests", interests.filter((t) => t !== tag));

  const totalCount = interests.length + (customTrimmed ? 1 : 0);
  const canNext = totalCount > 0;
  const meetsRecommended = totalCount >= RECOMMENDED_MIN;

  const renderChip = (item: TagItem) => {
    const { tag } = item;
    const on = selected.has(tag);
    const reachedMax = !on && interests.length >= HARD_MAX;
    return (
      <button
        key={tag}
        type="button"
        onClick={() => toggle(tag)}
        disabled={reachedMax}
        className={`${CHIP_BASE} ${
          on
            ? "border-holo-purple-mid text-holo-purple-mid"
            : reachedMax
              ? "border-holo-line text-holo-ink-4"
              : "border-holo-line text-holo-ink"
        }`}
      >
        <span className={on ? "text-holo-purple-mid" : "text-holo-ink-4"}>
          {on ? "✓" : "+"}
        </span>
        {tag}
      </button>
    );
  };

  return (
    <SignupLayout step={5}>
      <h1 className="shrink-0 text-[20px] font-bold leading-snug text-holo-ink">
        어떤 주제에
        <br />
        관심이 있으신가요?
      </h1>
      <div className="mt-2 flex shrink-0 items-baseline justify-between">
        <p className="text-[14px] text-holo-ink-3">
          AI를 활용해 딱 맞는 콘텐츠를 보여드립니다.
        </p>
        <span
          className={`text-[12px] tabular-nums ${
            meetsRecommended ? "text-holo-purple-mid" : "text-holo-ink-4"
          }`}
        >
          {totalCount}/{RECOMMENDED_MIN} 이상
        </span>
      </div>

      <div className="mt-4 flex shrink-0 flex-col gap-2 rounded-[12px] border border-holo-line-2 bg-holo-purple/5 p-3">
        <span className="text-[12px] text-holo-ink-3">선택한 관심사</span>
        {interests.length === 0 && !customTrimmed ? (
          <p className="text-[13px] text-holo-ink-4">아직 선택된 항목이 없어요.</p>
        ) : (
          <div className="flex max-h-[88px] flex-wrap gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {interests.map((tag) => (
              <SelectedChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
            ))}
            {customTrimmed && (
              <SelectedChip
                label={customTrimmed}
                onRemove={() => update("customInterest", "")}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 각 카테고리 = (라벨 + 칩들) 한 묶음. 묶음 사이는 넓게(gap-5), 라벨↔칩 간은 좁게(gap-1.5)
            두어 시각적으로 한 덩어리로 보이도록 한다. */}
        <div className="flex flex-col gap-5">
          {TAG_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <span className="px-2 text-[11px] font-medium text-holo-ink-4">
                {group.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {group.items.map(renderChip)}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <span className="px-2 text-[11px] font-medium text-holo-ink-4">
              기타
            </span>
            <div className="flex flex-wrap gap-2">
              {custom.length > 0 ? (
                <input
                  autoFocus
                  value={custom}
                  onChange={(e) => update("customInterest", e.target.value.slice(0, 20))}
                  placeholder="직접 입력하세요"
                  maxLength={20}
                  className="rounded-[20px] border border-holo-purple-mid bg-white px-3.5 py-1.5 text-[14px] text-holo-purple-mid outline-none placeholder:text-holo-ink-4"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => update("customInterest", " ")}
                  className={`${CHIP_BASE} border-holo-line text-holo-ink`}
                >
                  <span className="text-holo-ink-4">+</span>
                  직접 입력
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 pt-4">
        <p className="text-[12px] text-holo-ink-3">나중에 다시 수정할 수 있어요!</p>
        <button
          type="button"
          onClick={() => canNext && navigate("/signup/review")}
          disabled={!canNext}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canNext ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>
    </SignupLayout>
  );
}

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex h-[26px] shrink-0 items-center gap-1 rounded-full bg-holo-purple-mid pl-3 pr-1 text-[12px] font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 제거`}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-white transition hover:bg-white/15"
      >
        <CloseIcon />
      </button>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}