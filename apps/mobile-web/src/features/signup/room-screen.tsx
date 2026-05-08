import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";

const NICKNAME = "무지는 단무지";

const CATEGORIES = ["전체", "침대", "책상", "의자", "벽지", "바닥"];

type FurnitureItem = { id: string; label: string };
const ITEMS: FurnitureItem[] = [
  { id: "desk", label: "원목 책상 세트" },
  { id: "shelf", label: "원목 책장" },
];

export function RoomScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("전체");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showError, setShowError] = useState(false);

  const togglePick = (id: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowError(false);
  };

  const canNext = picked.size >= 2;

  const handleNext = () => {
    if (!canNext) {
      setShowError(true);
      return;
    }
    navigate("/home", { replace: true });
  };

  return (
    <SignupLayout step={6}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        거의 다 왔습니다!
        <br />
        <span className="text-holo-purple-mid">{NICKNAME}</span> 님의 방을 꾸며보세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        취향에 맞는 가구를 골라 나만의 방을 완성해보세요.
      </p>

      <div className="mt-5 flex justify-center">
        <img
          src="/illustrations/room-empty.svg"
          alt="빈 마이룸"
          className="h-[260px] w-full max-w-[320px] object-contain"
        />
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => {
            const on = activeCategory === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[14px] ${
                  on
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-line text-holo-ink"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {ITEMS.map((it) => {
          const on = picked.has(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => togglePick(it.id)}
              className={`flex aspect-square flex-col rounded-holo-input bg-holo-surface-2 p-3 ${
                on ? "border-2 border-holo-purple-mid" : "border-2 border-transparent"
              }`}
            >
              <div className="flex flex-1 items-center justify-center text-[12px] text-holo-ink-3">
                {/* 가구 일러스트 자리 (자산 받으면 교체) */}
                <FurniturePlaceholder />
              </div>
              <span className="mt-2 text-[13px] font-medium text-holo-ink">{it.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pt-6">
        {showError && (
          <p className="text-[13px] text-holo-error">튜토리얼을 진행해주세요!</p>
        )}
        <button
          type="button"
          onClick={handleNext}
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

function FurniturePlaceholder() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
      <rect x="6" y="20" width="48" height="28" rx="3" fill="#C4B89E" />
      <rect x="6" y="14" width="48" height="8" rx="2" fill="#A8967A" />
    </svg>
  );
}
