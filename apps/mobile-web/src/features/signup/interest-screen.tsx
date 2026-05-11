import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

const SHORT_TAGS = [
  "공동구매",
  "소분",
  "나눔",
  "도움",
  "맛집",
  "먹거리",
  "카페",
  "운동",
  "산책",
  "게임",
  "OTT",
  "영화",
  "드라마",
  "음악",
  "여행",
  "사진",
  "공부",
  "스터디",
  "반려동물",
  "자취",
  "소통",
];

const LONG_TAGS = ["단기성 소모임", "장기성 소모임"];

const CHIP_BASE =
  "flex h-[36px] w-full items-center justify-center gap-1 rounded-[20px] border-2 px-3 text-[14px] transition";

const RECOMMENDED_MIN = 3;
const HARD_MAX = 10;

export function InterestScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();
  const interests = data.interests;
  const custom = data.customInterest;
  const customActive = custom.length > 0;
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

  const renderChip = (tag: string) => {
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
        <span className={on ? "text-holo-purple-mid" : "text-holo-ink-4"}>+</span>
        {tag}
      </button>
    );
  };

  return (
<<<<<<< HEAD
    <SignupLayout step={4}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
=======
    <SignupLayout step={5}>
      <h1 className="shrink-0 text-[20px] font-bold leading-snug text-holo-ink">
>>>>>>> feat/auth-onboarding-2
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

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-3 gap-3">{SHORT_TAGS.map(renderChip)}</div>
        <div className="grid grid-cols-2 gap-3">{LONG_TAGS.map(renderChip)}</div>
        <div>
          {customActive ? (
            <input
              autoFocus
              value={custom}
              onChange={(e) => update("customInterest", e.target.value.slice(0, 20))}
              placeholder="직접 입력하세요"
              maxLength={20}
              className="h-[36px] w-full rounded-[20px] border-2 border-holo-purple-mid bg-white px-5 text-[14px] text-holo-purple-mid outline-none placeholder:text-holo-ink-4"
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

function SelectedChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
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
