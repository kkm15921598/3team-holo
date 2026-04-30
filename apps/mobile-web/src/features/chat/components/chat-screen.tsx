import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Room = {
  id: string;
  name: string;
  last: string;
  time: string;
  unread: number;
};

const ROOMS: Room[] = [
  { id: "1", name: "민수", last: "내일 시간 괜찮으세요?", time: "방금", unread: 2 },
  { id: "2", name: "지영", last: "감사합니다 :)", time: "10분 전", unread: 0 },
  { id: "3", name: "하늘", last: "사진 보내드릴게요", time: "1시간 전", unread: 1 },
  { id: "4", name: "주말 산책 모임", last: "그럼 9시 한강공원 매점 앞에서 봬요", time: "어제", unread: 5 },
  { id: "5", name: "서준", last: "맛집 추천해주신 곳 다녀왔어요!", time: "어제", unread: 0 },
  { id: "6", name: "예린", last: "공구 잘 썼습니다 감사해요", time: "3일 전", unread: 0 },
];

export function ChatScreen() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ROOMS;
    return ROOMS.filter((r) => r.name.includes(q) || r.last.includes(q));
  }, [query]);

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-4">
        <label className="flex h-11 items-center gap-2 rounded-full bg-gray-100 px-4">
          <SearchIcon />
          <input
            type="search"
            placeholder="대화 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </label>
      </div>

      <ul className="flex flex-col divide-y divide-gray-100">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link to={`/chat/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
              <div className="h-12 w-12 shrink-0 rounded-full bg-holo-purple-light" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{r.name}</span>
                  <span className="shrink-0 text-[11px] text-gray-400">{r.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-gray-500">{r.last}</span>
                  {r.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-holo-purple px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {r.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-gray-400">검색 결과 없음</li>
        )}
      </ul>
    </div>
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
