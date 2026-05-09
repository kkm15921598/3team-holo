import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";
import { CATEGORIES, furnitureSrc, type CategoryKey } from "./myroom-data";
import { CATALOG } from "./myroom-catalog";
import { RoomEditorView } from "./myroom-room-view";
import { setMyroomItems, useMyroomItems } from "./myroom-store";

export function MyroomScreen() {
  const navigate = useNavigate();
  const items = useMyroomItems();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");

  const filtered = useMemo(
    () => (activeCat === "all" ? CATALOG : CATALOG.filter((c) => c.kind === activeCat)),
    [activeCat],
  );

  const handleRemove = (id: string) => {
    setMyroomItems(items.filter((i) => i.id !== id));
    setSelectedId(null);
  };
  const handleFlip = (id: string) => {
    setMyroomItems(items.map((i) => (i.id === id ? { ...i, flipped: !i.flipped } : i)));
  };
  const handleMove = (id: string, x: number, y: number) => {
    setMyroomItems(items.map((i) => (i.id === id ? { ...i, x, y } : i)));
  };

  return (
    <main className="flex flex-1 flex-col px-4 pt-2 pb-6">
      <header className="flex items-center justify-between pb-3">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)} className="p-1">
          <BackIcon />
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full bg-holo-gradient-soft px-4 py-1.5 text-[13px] font-semibold text-white"
        >
          수정완료
        </button>
      </header>

      <div className="flex items-center gap-3 pb-3">
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
      </div>

      <div className="-mx-4 flex justify-center overflow-visible">
        <RoomEditorView
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={handleRemove}
          onFlip={handleFlip}
          onMove={handleMove}
        />
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-2">
          {CATEGORIES.map((c) => {
            const on = activeCat === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCat(c.key)}
                className={`shrink-0 rounded-[20px] px-4 py-1.5 text-[14px] ${
                  on
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-line text-holo-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
        {filtered.map((it) => (
          <div key={it.id} className="flex flex-col">
            <article className="relative flex aspect-square flex-col overflow-hidden rounded-holo-input bg-holo-surface-2 p-3">
              {it.isNew && (
                <span className="absolute left-2 top-2 z-10 rounded-[10px] bg-holo-gradient-soft px-2 py-0.5 text-[10px] font-semibold text-white">
                  NEW
                </span>
              )}
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <img
                  src={furnitureSrc({ kind: it.kind, variant: it.variant, flipped: false })}
                  alt={it.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {it.lockedAt && (
                <div className="absolute inset-0 flex items-center justify-center rounded-holo-input bg-black/40">
                  <LockIcon />
                </div>
              )}
              {it.price !== undefined && !it.lockedAt && (
                <button
                  type="button"
                  className="absolute bottom-3 left-3 right-3 z-10 rounded-full py-[6px] text-center text-[13px] tracking-tight text-white shadow-[0_3px_8px_rgba(255,108,184,0.35)]"
                  style={{ background: "#FF6CB8" }}
                >
                  <span style={{ fontWeight: 300 }}>{it.price}</span>
                  <span className="font-bold">P</span>
                  <span style={{ fontWeight: 300 }}> · 구매하기</span>
                </button>
              )}
            </article>
            <span className="mt-2 text-center text-[13px] font-medium text-holo-ink">
              {it.lockedAt ? `Lv.${it.lockedAt} 달성 시 해금` : it.label}
            </span>
          </div>
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
