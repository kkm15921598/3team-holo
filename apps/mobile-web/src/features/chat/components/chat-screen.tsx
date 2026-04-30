import { Link } from "react-router-dom";

const ROOMS = [
  { id: "1", name: "민수", last: "내일 시간 괜찮으세요?", time: "방금" },
  { id: "2", name: "지영", last: "감사합니다 :)", time: "10분 전" },
  { id: "3", name: "하늘", last: "사진 보내드릴게요", time: "1시간 전" },
];

export function ChatScreen() {
  return (
    <ul className="flex flex-col divide-y divide-gray-100">
      {ROOMS.map((r) => (
        <li key={r.id}>
          <Link to={`/chat/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
            <div className="h-11 w-11 shrink-0 rounded-full bg-holo-purple-light" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-900">{r.name}</span>
                <span className="shrink-0 text-[11px] text-gray-400">{r.time}</span>
              </div>
              <span className="truncate text-xs text-gray-500">{r.last}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
