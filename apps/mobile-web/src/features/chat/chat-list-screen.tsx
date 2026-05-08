import { Link } from "react-router-dom";
import { CHATROOMS } from "@/shared/mock/data";

export function ChatListScreen() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-3 pb-3">
      <ul className="flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        {CHATROOMS.map((room, idx) => (
          <li
            key={room.id}
            className={idx !== CHATROOMS.length - 1 ? "border-b border-holo-line" : ""}
          >
            <Link to={`/chat/${room.id}`} className="flex items-center gap-3 px-4 py-3">
              <Thumbnail group={room.isGroup} />
              <div className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold text-holo-ink">{room.name}</span>
                <span className="text-[12px] text-holo-ink-3">{room.subtitle}</span>
              </div>
              <ChevronRightIcon />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Thumbnail({ group }: { group: boolean }) {
  if (group) {
    return (
      <div className="grid h-10 w-10 shrink-0 grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="rounded bg-holo-line-3" />
        ))}
      </div>
    );
  }
  return <span className="h-10 w-10 shrink-0 rounded bg-holo-line-3" />;
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
