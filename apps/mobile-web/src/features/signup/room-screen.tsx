import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";

const NICKNAME = "무지는 단무지";

const CATEGORIES = ["전체", "침대", "책상", "의자", "벽지", "바닥"];

type FurnitureKind = "desk" | "shelf";
type FurnitureItem = { id: string; label: string; kind: FurnitureKind };
const ITEMS: FurnitureItem[] = [
  { id: "desk", label: "원목 책상 세트", kind: "desk" },
  { id: "shelf", label: "원목 책장", kind: "shelf" },
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
<<<<<<< HEAD
    <SignupLayout step={5}>
=======
    <SignupLayout step={7}>
>>>>>>> feat/auth-onboarding-2
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        거의 다 왔습니다!
        <br />
        <span className="text-holo-purple-mid">{NICKNAME}</span> 님의 방을 꾸며보세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        취향에 맞는 가구를 골라 나만의 방을 완성해보세요.
      </p>

      <div className="mt-5 flex justify-center">
        <EmptyRoom />
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => {
            const on = activeCategory === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={`h-[36px] shrink-0 rounded-[20px] border-2 px-4 text-[14px] transition ${
                  on
                    ? "border-holo-purple-mid text-holo-purple-mid"
                    : "border-holo-line text-holo-ink"
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
              <div className="flex flex-1 items-center justify-center">
                <FurnitureIcon kind={it.kind} />
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

function EmptyRoom() {
  return (
    <svg
      viewBox="0 0 240 240"
      className="h-[220px] w-[260px]"
      aria-label="빈 방 미리보기"
    >
      <polygon
        points="40,50 120,0 120,150 40,200"
        fill="#C8A8E8"
        stroke="#A88AC9"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points="120,0 200,50 200,200 120,150"
        fill="#A881D4"
        stroke="#8A66B5"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points="40,200 120,150 200,200 120,240"
        fill="#D9B488"
        stroke="#B89370"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line x1="60" y1="195" x2="125" y2="158" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="80" y1="205" x2="135" y2="172" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="100" y1="215" x2="145" y2="186" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="180" y1="195" x2="125" y2="160" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="160" y1="205" x2="115" y2="172" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="140" y1="215" x2="105" y2="186" stroke="#C9A275" strokeWidth="0.6" />
      <line x1="120" y1="0" x2="120" y2="150" stroke="#7A559E" strokeWidth="1.2" />
    </svg>
  );
}

function FurnitureIcon({ kind }: { kind: FurnitureKind }) {
  if (kind === "desk") {
    return (
      <svg width="72" height="56" viewBox="0 0 72 56" aria-hidden>
        <rect x="6" y="14" width="60" height="10" rx="2" fill="#C9A674" />
        <rect x="10" y="24" width="4" height="26" fill="#B89060" />
        <rect x="58" y="24" width="4" height="26" fill="#B89060" />
        <rect x="32" y="6" width="20" height="4" rx="1" fill="#9C7A4E" />
        <rect x="32" y="10" width="20" height="14" rx="1" fill="#B89060" />
      </svg>
    );
  }
  return (
    <svg width="60" height="64" viewBox="0 0 60 64" aria-hidden>
      <rect x="6" y="6" width="48" height="52" rx="2" fill="#C9A674" />
      <line x1="6" y1="22" x2="54" y2="22" stroke="#9C7A4E" strokeWidth="2" />
      <line x1="6" y1="40" x2="54" y2="40" stroke="#9C7A4E" strokeWidth="2" />
      <rect x="10" y="11" width="3" height="9" fill="#7A6248" />
      <rect x="14" y="11" width="3" height="9" fill="#5E4733" />
      <rect x="18" y="11" width="3" height="9" fill="#7A6248" />
      <rect x="10" y="29" width="6" height="9" fill="#5E4733" />
      <rect x="44" y="45" width="6" height="11" fill="#7A6248" />
    </svg>
  );
}
