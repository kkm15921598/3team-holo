import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ME } from "@/shared/mock/data";

const CATEGORIES = ["전체", "침대", "책상", "의자", "벽지", "바닥"];

type Item = { id: string; label: string; price?: number; isNew?: boolean; lockedAt?: number };
const ITEMS: Item[] = [
  { id: "purple-bed", label: "보라 원목 침대" },
  { id: "yellow-bed", label: "노란 원목 침대", price: 500, isNew: true },
  { id: "lock-5", label: "Lv.5 달성 시 해금", lockedAt: 5 },
  { id: "lock-7", label: "Lv.7 달성 시 해금", lockedAt: 7 },
];

export function MyroomScreen() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState("침대");
  return (
    <main className="flex flex-1 flex-col px-4 pt-2 pb-4">
      <header className="flex items-center gap-3 pb-3">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="h-12 w-12 rounded-full bg-holo-yellow-room" />
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[11px] font-semibold text-white">
              Lv.{ME.level}
            </span>
            <span className="text-[15px] font-semibold text-holo-ink">{ME.nickname}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-holo-ink-3">
            내 포인트 <span className="font-semibold text-holo-purple-text">{ME.points} P</span>
          </div>
        </div>
      </header>

      <img
        src="/illustrations/room-empty.svg"
        alt="마이룸"
        className="mx-auto h-[220px] w-full max-w-[320px] object-contain"
      />

      <div className="mt-4 -mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => {
            const on = activeCat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(c)}
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
        {ITEMS.map((it) => (
          <article
            key={it.id}
            className="relative flex aspect-square flex-col rounded-holo-input bg-holo-surface-2 p-3"
          >
            {it.isNew && (
              <span className="absolute left-2 top-2 rounded-[10px] bg-holo-gradient-soft px-2 py-0.5 text-[10px] font-semibold text-white">
                NEW
              </span>
            )}
            {it.lockedAt && (
              <div className="absolute inset-0 flex items-center justify-center rounded-holo-input bg-black/40">
                <LockIcon />
              </div>
            )}
            <div className="flex flex-1 items-center justify-center">
              <FurniturePlaceholder />
            </div>
            {it.price !== undefined && (
              <span className="mt-2 self-stretch rounded-full bg-holo-gradient-soft py-1 text-center text-[11px] font-semibold text-white">
                {it.price}P · 구매하기
              </span>
            )}
            <span className="mt-2 text-center text-[12px] font-medium text-holo-ink">
              {it.lockedAt ? `Lv.${it.lockedAt} 달성 시 해금` : it.label}
            </span>
          </article>
        ))}
      </div>
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
function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
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
