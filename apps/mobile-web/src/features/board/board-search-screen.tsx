import { useState } from "react";

const TYPE_FILTERS = ["단기성 모임", "장기성 모임"];
const BOARD_FILTERS = [
  "자유게시판",
  "공동구매 / 소분하기",
  "추천해요",
  "게임파티",
  "같이 운동해요",
  "드라마 · 영화",
  "맛집 & 먹거리",
  "도와주세요!",
];
const DISTANCE_FILTERS = ["50m~100m", "100m~500m", "500m~1km", "1km 이상"];
const GENDER_FILTERS = ["남자", "여자", "상관없음"];
const AGE_FILTERS = ["10대", "20대", "30대", "40대 이상"];

export function BoardSearchScreen() {
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const toggle = (group: string, value: string) => {
    setSelected((s) => {
      const next = { ...s, [group]: new Set(s[group] ?? []) };
      if (next[group].has(value)) next[group].delete(value);
      else next[group].add(value);
      return next;
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pt-2 pb-24">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="검색어를 입력해 주세요."
        className="h-[46px] w-full rounded-holo-input bg-holo-surface-2 px-4 text-[14px] outline-none placeholder:text-holo-ink-3"
      />

      <FilterGroup title="모임 유형" options={TYPE_FILTERS} selected={selected["type"]} onToggle={(v) => toggle("type", v)} />
      <FilterGroup title="게시판 유형" options={BOARD_FILTERS} selected={selected["board"]} onToggle={(v) => toggle("board", v)} />
      <FilterGroup title="거리" options={DISTANCE_FILTERS} selected={selected["distance"]} onToggle={(v) => toggle("distance", v)} />
      <FilterGroup title="모임 주최자 성별" options={GENDER_FILTERS} selected={selected["gender"]} onToggle={(v) => toggle("gender", v)} />
      <FilterGroup title="나이대" options={AGE_FILTERS} selected={selected["age"]} onToggle={(v) => toggle("age", v)} />

      <button
        type="button"
        className="mt-4 h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white"
      >
        검색하기
      </button>
    </main>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected?: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <section>
      <p className="mb-2 text-[16px] font-bold text-holo-ink">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected?.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`flex items-center gap-1 rounded-[20px] bg-white px-3 py-1.5 text-[13px] ${
                on ? "border border-holo-purple-mid text-holo-purple-mid" : "border border-transparent text-holo-ink"
              }`}
            >
              {o}
              {on && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-holo-purple-mid text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M6 18 18 6" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
