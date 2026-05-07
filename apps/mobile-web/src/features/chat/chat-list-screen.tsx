import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHATROOMS } from "@/shared/mock/data";

const LONG_PRESS_MS = 500;

export function ChatListScreen() {
  const navigate = useNavigate();
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [actionRoomId, setActionRoomId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const visibleRooms = CHATROOMS
    .filter((r) => !deleted.has(r.id))
    .slice()
    .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));

  const startPress = (roomId: string) => {
    longPressFired.current = false;
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setActionRoomId(roomId);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (roomId: string) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    navigate(`/chat/${roomId}`);
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActionRoomId(null);
  };

  const toggleMute = (id: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActionRoomId(null);
  };

  const requestDelete = (id: string) => {
    setActionRoomId(null);
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    setDeleted((prev) => {
      const next = new Set(prev);
      next.add(confirmDeleteId);
      return next;
    });
    setPinned((prev) => {
      const next = new Set(prev);
      next.delete(confirmDeleteId);
      return next;
    });
    setMuted((prev) => {
      const next = new Set(prev);
      next.delete(confirmDeleteId);
      return next;
    });
    setConfirmDeleteId(null);
  };

  return (
    <main className="flex flex-1 flex-col px-4 pt-3 pb-3">
      <ul className="flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        {visibleRooms.map((room, idx) => {
          const isPinned = pinned.has(room.id);
          const isMuted = muted.has(room.id);
          return (
            <li
              key={room.id}
              className={idx !== visibleRooms.length - 1 ? "border-b border-holo-line" : ""}
            >
              <button
                type="button"
                onClick={() => handleClick(room.id)}
                onTouchStart={() => startPress(room.id)}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onTouchCancel={cancelPress}
                onMouseDown={() => startPress(room.id)}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                className="flex w-full select-none items-center gap-3 px-4 py-3 text-left"
              >
                <Thumbnail group={room.isGroup} />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-1">
                    {isPinned && <PinIcon />}
                    <span className="text-[15px] font-semibold text-holo-ink">{room.name}</span>
                  </div>
                  <span className="text-[12px] text-holo-ink-3">{room.subtitle}</span>
                </div>
                {isMuted && <MuteIcon />}
                <ChevronRightIcon />
              </button>
            </li>
          );
        })}
      </ul>

      {actionRoomId && (
        <ActionSheet
          isPinned={pinned.has(actionRoomId)}
          isMuted={muted.has(actionRoomId)}
          onClose={() => setActionRoomId(null)}
          onPin={() => togglePin(actionRoomId)}
          onMute={() => toggleMute(actionRoomId)}
          onDelete={() => requestDelete(actionRoomId)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDeleteModal
          onYes={confirmDelete}
          onNo={() => setConfirmDeleteId(null)}
        />
      )}
    </main>
  );
}

function ActionSheet({
  isPinned,
  isMuted,
  onClose,
  onPin,
  onMute,
  onDelete,
}: {
  isPinned: boolean;
  isMuted: boolean;
  onClose: () => void;
  onPin: () => void;
  onMute: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 px-4 pb-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[330px] overflow-hidden rounded-[15px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onPin}
          className="flex w-full items-center gap-3 border-b border-holo-line px-4 py-4 text-left text-[14px] text-holo-ink"
        >
          <PinIcon />
          <span>{isPinned ? "고정 해제" : "채팅방 고정"}</span>
        </button>
        <button
          type="button"
          onClick={onMute}
          className="flex w-full items-center gap-3 border-b border-holo-line px-4 py-4 text-left text-[14px] text-holo-ink"
        >
          <BellIcon muted={!isMuted} />
          <span>{isMuted ? "알림 켜기" : "알림 끄기"}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center gap-3 px-4 py-4 text-left text-[14px] text-red-500"
        >
          <TrashIcon />
          <span>채팅방 삭제</span>
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[300px] overflow-hidden rounded-[12px] bg-white">
        <p className="px-4 py-5 text-center text-[14px] text-holo-ink">
          채팅방을 삭제하시겠습니까?
        </p>
        <div className="flex border-t border-holo-line">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 bg-holo-ink py-3 text-[14px] font-semibold text-white"
          >
            네
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 bg-holo-ink py-3 text-[14px] font-semibold text-white"
          >
            아니오
          </button>
        </div>
      </div>
    </div>
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
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#A8A8A8" stroke="#A8A8A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 9 8H4l4 4-2 8 6-4 6 4-2-8 4-4h-5z" />
    </svg>
  );
}
function BellIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
