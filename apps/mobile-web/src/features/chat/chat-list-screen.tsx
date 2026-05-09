import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CHATROOMS, type ChatRoom } from "@/shared/mock/data";

type Filter = "all" | "unread" | "groups";

export function ChatListScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const rooms = useMemo<ChatRoom[]>(() => {
    let list = [...CHATROOMS];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.lastMessage.toLowerCase().includes(q),
      );
    }
    if (filter === "unread") list = list.filter((r) => r.unread > 0);
    if (filter === "groups") list = list.filter((r) => r.isGroup);
    // 핀 고정 우선 정렬
    list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
    return list;
  }, [query, filter]);

  const totalUnread = CHATROOMS.reduce((acc, r) => acc + r.unread, 0);

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-3">
      {/* 검색바 */}
      <div className="flex items-center gap-2 rounded-full border border-holo-line-3 bg-white px-3 py-2 shadow-holo-card">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="대화방 또는 메시지 검색"
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-holo-ink-3"
        />
        {query && (
          <button type="button" aria-label="지우기" onClick={() => setQuery("")}>
            <CloseSmallIcon />
          </button>
        )}
      </div>

      {/* 필터 chip */}
      <div className="flex items-center gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          전체 {CHATROOMS.length}
        </FilterChip>
        <FilterChip active={filter === "unread"} onClick={() => setFilter("unread")}>
          안 읽음 {totalUnread}
        </FilterChip>
        <FilterChip active={filter === "groups"} onClick={() => setFilter("groups")}>
          그룹
        </FilterChip>
        <button
          type="button"
          aria-label="새 채팅"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-holo-gradient text-white"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 채팅방 리스트 */}
      <ul
        className="flex flex-1 flex-col overflow-y-auto rounded-holo-card bg-white shadow-holo-card"
        onClick={() => setActiveMenuId(null)}
      >
        {rooms.length === 0 ? (
          <li className="flex flex-1 items-center justify-center py-10 text-[13px] text-holo-ink-3">
            검색 결과가 없어요
          </li>
        ) : (
          rooms.map((room, idx) => (
            <li
              key={room.id}
              className={`relative ${idx !== rooms.length - 1 ? "border-b border-holo-line" : ""}`}
            >
              <Link
                to={`/chat/${room.id}`}
                className={`flex items-center gap-3 px-4 py-3 ${room.pinned ? "bg-holo-yellow-room/20" : ""}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveMenuId(room.id);
                }}
              >
                <Thumbnail group={room.isGroup} online={room.online} />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1">
                    {room.pinned && <PinIcon />}
                    <span className="truncate text-[15px] font-semibold text-holo-ink">
                      {room.name}
                    </span>
                    {room.muted && <MuteIcon />}
                  </div>
                  <span className="truncate text-[12px] text-holo-ink-3">
                    {room.lastMessage}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-holo-ink-3">{room.lastTime}</span>
                  {room.unread > 0 && (
                    <span
                      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${
                        room.muted ? "bg-holo-ink-3" : "bg-holo-purple-mid"
                      }`}
                    >
                      {room.unread > 99 ? "99+" : room.unread}
                    </span>
                  )}
                </div>
              </Link>

              {/* 롱프레스(우클릭) 컨텍스트 메뉴 */}
              {activeMenuId === room.id && (
                <div
                  className="absolute right-3 top-12 z-10 flex flex-col rounded-[10px] border border-holo-line bg-white py-1 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ContextItem icon={<PinIcon />}>
                    {room.pinned ? "고정 해제" : "상단 고정"}
                  </ContextItem>
                  <ContextItem icon={<MuteIcon />}>
                    {room.muted ? "알림 켜기" : "알림 끄기"}
                  </ContextItem>
                  <ContextItem icon={<ReadIcon />}>모두 읽음</ContextItem>
                  <ContextItem icon={<TrashIcon />} danger>
                    나가기
                  </ContextItem>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-full px-3 text-[12px] font-medium ${
        active
          ? "bg-holo-ink text-white"
          : "border border-holo-line-3 bg-white text-holo-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

function ContextItem({
  icon,
  danger,
  children,
}: {
  icon: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-2 text-[13px] ${
        danger ? "text-red-500" : "text-holo-ink"
      } hover:bg-holo-surface-2`}
    >
      {icon}
      {children}
    </button>
  );
}

function Thumbnail({ group, online }: { group: boolean; online?: boolean }) {
  return (
    <div className="relative">
      {group ? (
        <div className="grid h-10 w-10 shrink-0 grid-cols-2 gap-0.5 rounded-[8px] bg-holo-surface-2 p-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rounded bg-holo-yellow-room" />
          ))}
        </div>
      ) : (
        <span className="block h-10 w-10 shrink-0 rounded-full bg-holo-yellow-room" />
      )}
      {online && (
        <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
function CloseSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#7B61FF" aria-hidden>
      <path d="M16 3 9 10l-4 1 8 8 1-4 7-7z" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M18 8a6 6 0 0 0-9.3-5" />
      <path d="M6 8v5l-2 4h12" />
    </svg>
  );
}
function ReadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 5 5 11-11" />
      <path d="m12 16 8-8" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

