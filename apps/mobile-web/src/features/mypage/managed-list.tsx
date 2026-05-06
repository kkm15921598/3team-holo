import { useState } from "react";
import type { Post } from "@/shared/mock/data";

const CATEGORY_LABEL: Record<string, string> = {
  food: "식사",
  share: "소분",
  recommend: "추천",
  game: "게임",
  sport: "운동",
  media: "영화",
  help: "도움",
  free: "자유",
};

export function ManagedList({
  title,
  manage,
  onToggleManage,
  items,
}: {
  title: string;
  manage: boolean;
  onToggleManage: () => void;
  items: Post[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    setSelected(new Set());
    onToggleManage();
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-holo-line-3 px-4 py-3">
        <span className="text-[14px] font-semibold text-holo-ink">
          {manage ? "삭제할 게시글을 선택해 주세요" : title}
        </span>
        {manage ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={selected.size === 0}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold text-white ${
              selected.size === 0 ? "bg-holo-ink-4" : "bg-holo-purple-mid"
            }`}
          >
            삭제하기
          </button>
        ) : (
          <button type="button" onClick={onToggleManage} className="text-[13px] text-holo-ink-2">
            관리하기
          </button>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {items.map((p) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => (manage ? toggle(p.id) : null)}
                className={`flex w-full items-start gap-3 rounded-holo-card bg-white p-4 text-left shadow-holo-card ${
                  manage && on ? "border border-holo-purple-mid" : ""
                }`}
              >
                <span className="text-[13px] font-semibold text-holo-ink-2">
                  {CATEGORY_LABEL[p.category] ?? "기타"}
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-[14px] font-semibold text-holo-ink">{p.title}</span>
                  <span className="mt-1 text-[12px] text-holo-ink-3">{p.description}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-holo-ink-3">
                    {p.distance} · {p.duration}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-holo-lilac-light text-white">
                    <ArrowChip />
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ArrowChip() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}
