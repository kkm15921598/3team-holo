import { Link } from "react-router-dom";

const FRIENDS = [
  { id: "1", name: "민수", neighborhood: "역삼1동", level: 5 },
  { id: "2", name: "지영", neighborhood: "역삼1동", level: 3 },
  { id: "3", name: "하늘", neighborhood: "삼성동", level: 7 },
  { id: "4", name: "서준", neighborhood: "역삼2동", level: 2 },
  { id: "5", name: "예린", neighborhood: "삼성동", level: 4 },
];

export function FriendsScreen() {
  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3 pt-4">
        <SearchBar placeholder="친구 검색" />
      </div>

      <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-500">
        <span>친구 {FRIENDS.length}명</span>
        <button type="button" className="font-medium text-holo-purple">
          + 친구 추가
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-gray-100">
        {FRIENDS.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-holo-purple-light" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-gray-900">{f.name}</span>
              <span className="text-xs text-gray-500">
                {f.neighborhood} · Lv.{f.level}
              </span>
            </div>
            <Link
              to={`/chat/${f.id}`}
              className="rounded-full bg-holo-purple-light px-3 py-1.5 text-xs font-semibold text-holo-purple-deep"
            >
              채팅
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-full bg-gray-100 px-4">
      <SearchIcon />
      <input
        type="search"
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
      />
    </label>
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
