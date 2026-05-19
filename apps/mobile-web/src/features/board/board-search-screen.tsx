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
const DISTANCE_FILTERS = ["1km 이하", "1km~5km", "5km~10km"];
const GENDER_FILTERS = ["남자", "여자"];
const AGE_FILTERS = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];

type GroupKey = "type" | "board" | "distance" | "gender" | "age";

export function BoardSearchScreen() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
    type: true,
    board: true,
    distance: true,
    gender: true,
    age: true,
  });

  const toggle = (group: GroupKey, value: string) => {
    setSelected((s) => {
      const next = { ...s, [group]: new Set(s[group] ?? []) };
      if (next[group].has(value)) next[group].delete(value);
      else next[group].add(value);
      return next;
    });
  };

  const toggleGroup = (group: GroupKey) => {
    setOpenGroups((s) => ({ ...s, [group]: !s[group] }));
  };

  const hasKeyword = keyword.trim().length > 0;
  const hasSelected = Object.values(selected).some((s) => s.size > 0);
  const isActive = hasKeyword || hasSelected;

  const handleReset = () => {
    setKeyword("");
    setSelected({});
  };

  const handleSearch = () => {
    if (!isActive) return;
    const q = keyword.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const putList = (key: string, group: string) => {
      const set = selected[group];
      if (!set || set.size === 0) return;
      params.set(key, [...set].join(","));
    };
    putList("type", "type");
    putList("board", "board");
    putList("distance", "distance");
    putList("age", "age");
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
  };

  return (
    <main className="relative flex flex-1 flex-col bg-[#EFE6FA]">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-2 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 검색어 입력 */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-holo-ink-3">
            <SearchIcon />
          </span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색어를 입력해 주세요."
            className="h-[42px] w-full rounded-[14px] bg-white pl-11 pr-4 text-[14px] outline-none placeholder:text-holo-ink-3"
          />
        </div>

        <FilterGroup
          title="모임 유형"
          icon={<PeopleIcon />}
          open={openGroups.type}
          onToggle={() => toggleGroup("type")}
          options={TYPE_FILTERS}
          selected={selected["type"]}
          onSelect={(v) => toggle("type", v)}
        />
        {/* "게시판 유형" 카드는 화면에서만 숨김 — 필터링 로직(URL ?board= 파라미터,
            handleSearch 의 putList 등) 은 그대로 유지해 외부 진입 시 정상 동작.
            나중에 다시 노출하려면 아래 FilterGroup 만 복원하면 됨.
        <FilterGroup
          title="게시판 유형"
          icon={<ChatIcon />}
          open={openGroups.board}
          onToggle={() => toggleGroup("board")}
          options={BOARD_FILTERS}
          selected={selected["board"]}
          onSelect={(v) => toggle("board", v)}
        />
        */}
        <FilterGroup
          title="거리"
          icon={<PinIcon />}
          open={openGroups.distance}
          onToggle={() => toggleGroup("distance")}
          options={DISTANCE_FILTERS}
          selected={selected["distance"]}
          onSelect={(v) => toggle("distance", v)}
        />
        <FilterGroup
          title="모임 주최자 성별"
          icon={<HostIcon />}
          open={openGroups.gender}
          onToggle={() => toggleGroup("gender")}
          options={GENDER_FILTERS}
          selected={selected["gender"]}
          onSelect={(v) => toggle("gender", v)}
        />
        <FilterGroup
          title="나이대"
          icon={<SmileIcon />}
          open={openGroups.age}
          onToggle={() => toggleGroup("age")}
          options={AGE_FILTERS}
          selected={selected["age"]}
          onSelect={(v) => toggle("age", v)}
        />
      </div>

      {/* 하단 고정 액션바 */}
      <div className="absolute inset-x-0 bottom-0 flex shrink-0 gap-2 bg-white px-4 pb-3 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={handleReset}
          className="h-[46px] flex-[1] rounded-[14px] border-2 border-holo-purple-mid bg-white text-[15px] font-semibold text-holo-purple-mid active:opacity-80"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!isActive}
          className={`h-[46px] flex-[2] rounded-[14px] text-[15px] font-semibold text-white transition active:opacity-90 ${
            isActive ? "bg-holo-purple-mid" : "bg-holo-line-2"
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
  icon,
  open,
  onToggle,
  options,
  selected,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  options: string[];
  selected?: Set<string>;
  onSelect: (v: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2"
      >
        <span className="flex items-center gap-2">
          <span className="text-holo-purple-mid">{icon}</span>
          <span className="text-[14px] font-bold text-holo-ink">{title}</span>
        </span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-0">
          {options.map((o) => {
            const on = selected?.has(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onSelect(o)}
                className={`rounded-full px-3 py-1 text-[13px] transition ${
                  on
                    ? "bg-holo-purple-mid font-semibold text-white"
                    : "bg-[#F3EBFF] font-medium text-holo-ink-2 active:bg-[#E8DCFA]"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 아이콘
// ─────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6M14 14c2.5 0 7 1.5 7 5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/** 모임 주최자 성별 — 왕관(host) 아이콘. */
function HostIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8l4 4 5-6 5 6 4-4v10H3z" />
      <path d="M3 18h18" />
    </svg>
  );
}

/** 나이대 — 웃는 얼굴 (사람 그룹 분류 느낌). */
function SmileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8A8A8"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 transition-transform ${open ? "" : "rotate-180"}`}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

