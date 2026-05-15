import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
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

  const hasKeyword = keyword.trim().length > 0;
  const hasSelected = Object.values(selected).some((s) => s.size > 0);
  const isActive = hasKeyword || hasSelected;

  return (
    <main className="flex flex-1 flex-col">
      {/* Lavender area — pt-[23px] extends the bg 23px above the search input. */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-[#EBE3F5] px-4 pt-[23px] pb-24">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색어를 입력해 주세요."
          className="h-[46px] w-full rounded-holo-input bg-white px-4 text-[14px] outline-none placeholder:text-holo-ink-3"
        />

        <FilterGroup
          title="모임 유형"
          options={TYPE_FILTERS}
          selected={selected["type"]}
          onToggle={(v) => toggle("type", v)}
        />
        <FilterGroup
          title="게시판 유형"
          options={BOARD_FILTERS}
          selected={selected["board"]}
          onToggle={(v) => toggle("board", v)}
        />
        <FilterGroup
          title="거리"
          options={DISTANCE_FILTERS}
          selected={selected["distance"]}
          onToggle={(v) => toggle("distance", v)}
        />
        <FilterGroup
          title="모임 주최자 성별"
          options={GENDER_FILTERS}
          selected={selected["gender"]}
          onToggle={(v) => toggle("gender", v)}
        />
        <FilterGroup
          title="나이대"
          options={AGE_FILTERS}
          selected={selected["age"]}
          onToggle={(v) => toggle("age", v)}
        />

        {/* 검색하기 button: text 20px SemiBold, height preserved at 60px */}
        <button
          type="button"
          disabled={!isActive}
          onClick={() => {
            const q = keyword.trim();
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            // 성별 필터: "남자" / "여자" 만 단일 선택했을 때 적용
            // "상관없음" 또는 미선택은 필터 없음
            const genderSet = selected["gender"];
            if (genderSet) {
              const picks = [...genderSet];
              if (picks.length === 1) {
                if (picks[0] === "남자") params.set("gender", "M");
                else if (picks[0] === "여자") params.set("gender", "F");
              }
            }
            const query = params.toString();
            navigate(query ? `/board/list?${query}` : "/board/list");
          }}
          className={`mt-4 h-[60px] w-full rounded-holo-pill text-[20px] font-semibold text-[#FFFFFF] transition-colors ${
            isActive ? "bg-[#000000]" : "bg-[#A8A8A8]"
          }`}
        >
          검색하기
        </button>
      </div>
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
          // 16px Regular text with leading-tight + py-1.5 keeps the rendered
          // height close to the original (13px text * 1.5 leading + py-1.5 ≈ 16px * 1.25 + py-1.5).
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-[20px] bg-white px-3 py-1.5 text-[16px] font-normal leading-tight ${
                on
                  ? "border border-holo-purple-mid text-holo-purple-mid"
                  : "border border-transparent text-holo-ink"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </section>
  );
}
