import { useState } from "react";

type Spot = {
  id: string;
  title: string;
  category: string;
  distance: string;
  x: number;
  y: number;
};

const SPOTS: Spot[] = [
  { id: "1", title: "역삼1동 주민센터", category: "공공", distance: "320m", x: 35, y: 45 },
  { id: "2", title: "강남스퀘어 카페", category: "카페", distance: "150m", x: 55, y: 35 },
  { id: "3", title: "한강공원 모임", category: "이벤트", distance: "1.2km", x: 70, y: 60 },
  { id: "4", title: "도와주세요 · 택배 보관", category: "도움", distance: "80m", x: 45, y: 55 },
];

export function MapScreen() {
  const [selectedId, setSelectedId] = useState<string>(SPOTS[0]!.id);
  const selected = SPOTS.find((s) => s.id === selectedId) ?? SPOTS[0]!;

  return (
    <div className="relative flex flex-col">
      <div className="absolute inset-x-0 top-0 z-[1] flex gap-2 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md">
          <SearchIcon />
          <span className="text-sm text-gray-500">우리 동네 검색</span>
        </div>
        <button
          type="button"
          aria-label="현재 위치"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
        >
          <LocateIcon />
        </button>
      </div>

      <div className="relative h-[440px] overflow-hidden bg-[#EAF1F5]">
        <MapBackground />
        {SPOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            aria-label={s.title}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-full"
          >
            <Pin active={s.id === selectedId} />
          </button>
        ))}
      </div>

      <div className="p-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full bg-holo-purple-light px-2 py-0.5 font-semibold text-holo-purple-deep">
              {selected.category}
            </span>
            <span className="text-gray-400">{selected.distance}</span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-gray-900">{selected.title}</h3>
          <p className="mt-1 text-xs text-gray-500">
            지도 SDK 연동 전 미리보기입니다 (P2에서 카카오맵 연결).
          </p>
          <button
            type="button"
            className="mt-3 h-9 w-full rounded-full bg-holo-gradient text-xs font-semibold text-white"
          >
            자세히 보기
          </button>
        </article>
      </div>
    </div>
  );
}

function MapBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#D1DEE5" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />
      <path d="M0 60 Q 30 50 50 65 T 100 55" stroke="#A9C4D0" strokeWidth="1" fill="none" />
      <path d="M20 0 L 30 100" stroke="#C7D6DD" strokeWidth="0.6" fill="none" />
      <path d="M70 0 L 65 100" stroke="#C7D6DD" strokeWidth="0.6" fill="none" />
    </svg>
  );
}

function Pin({ active }: { active: boolean }) {
  return (
    <svg width={active ? 36 : 26} height={active ? 36 : 26} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8z"
        fill={active ? "#B77CFF" : "#8B5CF6"}
      />
      <circle cx="12" cy="10" r="3" fill="#fff" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
