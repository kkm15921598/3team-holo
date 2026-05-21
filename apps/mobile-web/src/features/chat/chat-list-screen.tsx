import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { type ChatRoom } from "@/shared/mock/data";
import { useFriends } from "@/features/mypage/friends-store";
import {
  addRoom,
  leaveRoomById,
  markRoomRead,
  togglePinned,
  toggleMuted,
  useRooms,
} from "./rooms-store";
import { getMessagesForRoom } from "./messages-store";
import { getAvatarUrl } from "./avatars";
import { GroupAvatar } from "./group-avatar";
import { dmRoomIdFor, lookupPhoneByNickname } from "./dm-utils";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

type Filter = "all" | "unread" | "groups" | "meetings";

export function ChatListScreen() {
  const navigate = useNavigate();
  const allRooms = useRooms();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  // 필터 상태를 URL 의 ?tab= 으로 동기화 — 채팅방 들어갔다 뒤로가도 마지막 탭 복원
  const tabParam = searchParams.get("tab");
  const filter: Filter =
    tabParam === "unread" || tabParam === "groups" || tabParam === "meetings"
      ? tabParam
      : "all";
  const setFilter = (next: Filter) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "all") sp.delete("tab");
    else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  };

  const togglePin = (id: string) => {
    const target = allRooms.find((r) => r.id === id);
    const nextPinned = !target?.pinned;
    togglePinned(id);
    showToast(nextPinned ? "상단에 고정했어요" : "고정을 해제했어요");
  };

  const toggleMute = (id: string) => {
    const target = allRooms.find((r) => r.id === id);
    const nextMuted = !target?.muted;
    toggleMuted(id);
    showToast(nextMuted ? "알림을 껐어요" : "알림을 켰어요");
  };

  const markRead = (id: string) => {
    markRoomRead(id);
    showToast("모두 읽음 처리했어요");
  };

  const leaveRoom = (id: string) => {
    leaveRoomById(id);
    showToast("채팅방을 나갔어요");
  };

  const rooms = useMemo<ChatRoom[]>(() => {
    let list = [...allRooms];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) => {
        // 1) 방 이름이나 마지막 메시지 매칭
        if (
          r.name.toLowerCase().includes(q) ||
          r.lastMessage.toLowerCase().includes(q)
        ) {
          return true;
        }
        // 2) 캐시된 전체 메시지 내용도 검색
        const messages = getMessagesForRoom(r.id);
        if (!messages) return false;
        return messages.some(
          (m) =>
            (m.content ?? "").toLowerCase().includes(q) ||
            (m.nickname ?? "").toLowerCase().includes(q) ||
            (m.fileName ?? "").toLowerCase().includes(q),
        );
      });
    }
    if (filter === "unread") list = list.filter((r) => r.unread > 0);
    // "그룹"은 모임 정보 없는 일반 그룹채팅만
    if (filter === "groups") list = list.filter((r) => r.isGroup && !r.meeting);
    // "모임"은 게시판에서 생성된 모임 정보 있는 채팅방
    if (filter === "meetings") list = list.filter((r) => r.isGroup && !!r.meeting);
    // 핀 고정 우선 → 같은 그룹 내에서는 최신 활동(updatedAt) 내림차순.
    // updatedAt 이 없는 방(레거시 데이터)은 가장 오래된 것으로 취급해 맨 뒤로.
    list.sort((a, b) => {
      const pinDiff = Number(!!b.pinned) - Number(!!a.pinned);
      if (pinDiff !== 0) return pinDiff;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
    return list;
  }, [query, filter, allRooms]);

  const totalUnread = allRooms.reduce((acc, r) => acc + r.unread, 0);

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
          className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3"
        />
        {query && (
          <button type="button" aria-label="지우기" onClick={() => setQuery("")}>
            <CloseSmallIcon />
          </button>
        )}
      </div>

      {/* 필터 chip */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          전체 {allRooms.length}
        </FilterChip>
        <FilterChip active={filter === "unread"} onClick={() => setFilter("unread")}>
          안 읽음 {totalUnread}
        </FilterChip>
        <FilterChip active={filter === "meetings"} onClick={() => setFilter("meetings")}>
          📅 모임
        </FilterChip>
        <button
          type="button"
          aria-label="새 채팅"
          onClick={() => setShowNew(true)}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-holo-gradient text-white"
        >
          <PlusIcon />
        </button>
      </div>

      {/* 채팅방 리스트 */}
      <ul
        className="flex flex-col rounded-holo-card bg-white shadow-holo-card"
        onClick={() => setActiveMenuId(null)}
      >
        {rooms.length === 0 ? (
          <li className="flex items-center justify-center py-10 text-[13px] text-holo-ink-3">
            검색 결과가 없어요
          </li>
        ) : (
          rooms.map((room, idx) => (
            <RoomRow
              key={room.id}
              room={room}
              isLast={idx === rooms.length - 1}
              onOpenMenu={() => setActiveMenuId(room.id)}
              onTogglePin={() => togglePin(room.id)}
            />
          ))
        )}
      </ul>

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-holo-ink/90 px-4 py-2 text-[12px] text-white shadow-lg">
          {toast}
        </div>
      )}

      {activeMenuId &&
        (() => {
          const target = allRooms.find((r) => r.id === activeMenuId);
          if (!target) return null;
          return (
            <RoomActionSheet
              room={target}
              onClose={() => setActiveMenuId(null)}
              onTogglePin={() => togglePin(target.id)}
              onToggleMute={() => toggleMute(target.id)}
              onMarkRead={() => markRead(target.id)}
              onLeave={() => leaveRoom(target.id)}
            />
          );
        })()}

      {showNew && (
        <NewChatSheet
          existingRooms={allRooms}
          onClose={() => setShowNew(false)}
          onStart1to1={async (friendId, friendNick) => {
            const existing = allRooms.find(
              (r) => !r.isGroup && r.name === friendNick,
            );
            if (existing) {
              setShowNew(false);
              navigate(`/chat/${existing.id}`);
              return;
            }
            // 두 사용자가 같은 room_id 를 공유하도록 phone 기반 결정론적 ID 사용.
            // 친구의 phone 조회 실패 시(미가입자 등) 기존 방식으로 폴백.
            const myPhone = getCurrentAccount();
            const friendPhone = await lookupPhoneByNickname(friendNick);
            const newId =
              myPhone && friendPhone
                ? dmRoomIdFor(myPhone, friendPhone)
                : `f${friendId}-${Date.now()}`;
            // 결정론적 ID 라 이미 만든 방이 있을 수 있음 — 중복 추가 방지
            const dup = allRooms.find((r) => r.id === newId);
            if (dup) {
              setShowNew(false);
              navigate(`/chat/${newId}`);
              return;
            }
            const newRoom: ChatRoom = {
              id: newId,
              name: friendNick,
              subtitle: "1:1",
              isGroup: false,
              memberCount: 2,
              lastMessage: "(대화를 시작해보세요)",
              lastTime: "방금",
              unread: 0,
              online: false,
            };
            addRoom(newRoom);
            setShowNew(false);
            navigate(`/chat/${newId}`);
          }}
          onStartGroup={(friendIds, friendNicks) => {
            if (friendIds.length === 0) return;
            const newId = `g-${Date.now()}`;
            const newRoom: ChatRoom = {
              id: newId,
              // "첫친구, 외 N명" — N = 첫친구 제외한 나머지 + 나
              name: `${friendNicks[0]}, 외 ${friendNicks.length}명`,
              subtitle: friendNicks.join(", "),
              isGroup: true,
              memberCount: friendIds.length + 1, // +1 for self
              memberNames: friendNicks, // 실제 초대된 친구들
              lastMessage: "(대화를 시작해보세요)",
              lastTime: "방금",
              unread: 0,
            };
            addRoom(newRoom);
            setShowNew(false);
            navigate(`/chat/${newId}`);
          }}
        />
      )}
    </main>
  );
}

function NewChatSheet({
  existingRooms,
  onClose,
  onStart1to1,
  onStartGroup,
}: {
  existingRooms: ChatRoom[];
  onClose: () => void;
  onStart1to1: (friendId: string, friendNick: string) => void | Promise<void>;
  onStartGroup: (friendIds: string[], friendNicks: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mode, setMode] = useState<"1:1" | "group">("1:1");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const close = (after?: () => void) => {
    setClosing(true);
    setOpen(false);
    window.setTimeout(() => {
      onClose();
      after?.();
    }, 220);
  };

  // 실제 친구 store 에서 가져옴 — 신규 가입자(친구 0명)는 빈 리스트가 나온다.
  // 닉네임 중복은 첫 등장만 사용.
  const realFriends = useFriends();
  const uniqueFriends = useMemo(() => {
    const seen = new Set<string>();
    return realFriends.filter((f) => {
      if (seen.has(f.nickname)) return false;
      seen.add(f.nickname);
      return true;
    });
  }, [realFriends]);

  const filtered = useMemo(() => {
    if (!q.trim()) return uniqueFriends;
    const lq = q.trim().toLowerCase();
    return uniqueFriends.filter((f) => f.nickname.toLowerCase().includes(lq));
  }, [q, uniqueFriends]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startGroup = () => {
    const ids = Array.from(selected);
    const nicks = ids
      .map((id) => uniqueFriends.find((f) => f.id === id)?.nickname)
      .filter((x): x is string => Boolean(x));
    onStartGroup(ids, nicks);
  };

  return (
    <div
      className={`fixed inset-0 z-40 transition-colors duration-200 ${
        open && !closing ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={() => close()}
    >
      <div
        className={`absolute bottom-0 left-1/2 flex h-[80vh] w-full -translate-x-1/2 flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out md:max-w-[360px] ${
          open && !closing ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-2 h-1 w-10 rounded bg-holo-line-3" />

        {/* 헤더 — 가운데 "새 채팅" 을 absolute 로 진짜 중앙 고정. 좌/우 버튼의 너비가
            다르더라도 (특히 그룹 모드의 "시작 (N)" 카운트가 늘면) 제목이 흔들리지 않게. */}
        <div className="relative flex items-center justify-between border-b border-holo-line px-4 py-2">
          <button
            type="button"
            onClick={() => close()}
            className="relative z-10 text-[13px] text-holo-ink-3"
          >
            취소
          </button>
          <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold text-holo-ink">
            새 채팅
          </span>
          {mode === "group" ? (
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => close(startGroup)}
              className={`relative z-10 text-[13px] font-semibold ${
                selected.size === 0 ? "text-holo-ink-3" : "text-holo-purple-mid"
              }`}
            >
              시작 ({selected.size})
            </button>
          ) : (
            <span className="w-12" />
          )}
        </div>

        {/* 모드 탭 */}
        <div className="flex gap-2 px-4 pt-3">
          <ModeTab
            active={mode === "1:1"}
            onClick={() => {
              setMode("1:1");
              setSelected(new Set());
            }}
          >
            1:1 채팅
          </ModeTab>
          <ModeTab
            active={mode === "group"}
            onClick={() => {
              setMode("group");
              setSelected(new Set());
            }}
          >
            그룹 채팅
          </ModeTab>
        </div>

        {/* 검색 */}
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-full border border-holo-line-3 bg-white px-3 py-2">
          <SearchIcon />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="친구 검색"
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3"
          />
        </div>

        <p className="px-5 pt-3 pb-1 text-[11px] text-holo-ink-3">
          친구 {filtered.length}명
        </p>

        {/* 친구 목록 */}
        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-holo-ink-3">
              친구를 찾을 수 없어요
            </li>
          ) : (
            filtered.map((f) => {
              const isSelected = selected.has(f.id);
              const hasRoom = existingRooms.some(
                (r) => !r.isGroup && r.name === f.nickname,
              );
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === "1:1") {
                        close(() => onStart1to1(f.id, f.nickname));
                      } else {
                        toggleSelect(f.id);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-holo-surface-2"
                  >
                    <img
                      src={getAvatarUrl(f.nickname)}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                      style={{ backgroundColor: f.avatarBg }}
                    />
                    <span className="flex-1 text-left text-[14px] text-holo-ink">
                      {f.nickname}
                    </span>
                    {mode === "1:1" && hasRoom && (
                      <span className="text-[10px] text-holo-ink-3">기존 대화방</span>
                    )}
                    {mode === "group" && (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-holo-purple-mid bg-holo-purple-mid"
                            : "border-holo-line-3"
                        }`}
                      >
                        {isSelected && <CheckIcon />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

function ModeTab({
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
      className={`flex-1 rounded-full py-1.5 text-[13px] font-medium ${
        active
          ? "bg-holo-ink text-white"
          : "border border-holo-line-3 bg-white text-holo-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5 9-11" />
    </svg>
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
  // 활성/비활성 둘 다 동일하게 1px 보더를 가지도록 통일.
  // 활성 시엔 보더 색을 배경(검정) 과 같게 해서 시각적으로 안 보이게.
  // → 칩의 외곽 크기가 두 상태에서 100% 같아져 텍스트 위치 흔들림 없음.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-full border px-3 text-[12px] font-medium ${
        active
          ? "border-holo-ink bg-holo-ink text-white"
          : "border-holo-line-3 bg-white text-holo-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

function RoomRow({
  room,
  isLast,
  onOpenMenu,
  onTogglePin,
}: {
  room: ChatRoom;
  isLast: boolean;
  onOpenMenu: () => void;
  onTogglePin: () => void;
}) {
  // 롱프레스: pointer 이벤트로 통일 (마우스/터치/펜 동시 지원)
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const startPress = (x: number, y: number) => {
    longPressFired.current = false;
    startX.current = x;
    startY.current = y;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onOpenMenu();
    }, 450);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <li
      className={`relative ${isLast ? "" : "border-b border-holo-line"}`}
    >
      <Link
        to={`/chat/${room.id}`}
        draggable={false}
        className={`flex select-none items-center gap-3 px-4 py-3 ${room.pinned ? "bg-holo-yellow-room/20" : ""}`}
        onContextMenu={(e) => {
          e.preventDefault();
          longPressFired.current = true;
          onOpenMenu();
        }}
        onClick={(e) => {
          // 롱프레스가 떴으면 네비게이션 차단
          if (longPressFired.current) {
            e.preventDefault();
            e.stopPropagation();
            longPressFired.current = false;
          }
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          // 좌클릭/터치만 (우클릭은 onContextMenu)
          if (e.button !== 0 && e.pointerType === "mouse") return;
          startPress(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          // 8px 이상 움직이면 스크롤로 간주 → 롱프레스 취소
          const dx = Math.abs(e.clientX - startX.current);
          const dy = Math.abs(e.clientY - startY.current);
          if (dx > 8 || dy > 8) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
      >
        <Thumbnail room={room} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-1">
            {room.pinned && (
              <button
                type="button"
                aria-label="고정 해제"
                title="탭하면 고정이 해제돼요"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin();
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-holo-line-3"
              >
                <PinIcon />
              </button>
            )}
            {room.meeting && (
              <span className="shrink-0 rounded-[4px] bg-holo-purple-mid px-1 py-0.5 text-[9px] font-semibold text-white">
                모임
              </span>
            )}
            <span className="truncate text-[15px] font-semibold text-holo-ink">
              {room.name}
            </span>
            {room.isGroup && (
              <span className="shrink-0 text-[12px] text-holo-ink-3">
                {room.memberCount}
              </span>
            )}
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
    </li>
  );
}

function RoomActionSheet({
  room,
  onClose,
  onTogglePin,
  onToggleMute,
  onMarkRead,
  onLeave,
}: {
  room: ChatRoom;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onMarkRead: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // 마운트 직후 한 프레임 뒤에 open=true → translate 트랜지션 발동 (슬라이드업)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const close = (after?: () => void) => {
    setClosing(true);
    setOpen(false);
    window.setTimeout(() => {
      onClose();
      after?.();
    }, 220);
  };

  return (
    <div
      className={`fixed inset-0 z-40 transition-colors duration-200 ${
        open && !closing ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={() => close()}
    >
      <div
        className={`absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-2xl bg-white pb-2 shadow-2xl transition-transform duration-300 ease-out md:max-w-[360px] ${
          open && !closing ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-3 h-1 w-10 rounded bg-holo-line-3" />

        {/* 채팅방 정보 헤더 */}
        <div className="flex items-center gap-3 border-b border-holo-line px-5 pb-3">
          <Thumbnail room={room} />
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-holo-ink">{room.name}</span>
            <span className="text-[12px] text-holo-ink-3">{room.subtitle}</span>
          </div>
        </div>

        {/* 액션 목록 */}
        <ul className="flex flex-col py-2">
          <SheetItem
            icon={<PinIcon />}
            label={room.pinned ? "상단 고정 해제" : "상단에 고정"}
            onClick={() => close(onTogglePin)}
          />
          <SheetItem
            icon={<MuteIcon />}
            label={room.muted ? "알림 켜기" : "알림 끄기"}
            onClick={() => close(onToggleMute)}
          />
          <SheetItem
            icon={<ReadIcon />}
            label="모두 읽음 처리"
            onClick={() => close(onMarkRead)}
          />
          <SheetItem
            icon={<TrashIcon />}
            label="채팅방 나가기"
            danger
            onClick={() => close(onLeave)}
          />
        </ul>

        {/* 취소 버튼 */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => close()}
            className="h-12 w-full rounded-xl bg-holo-surface-2 text-[14px] font-semibold text-holo-ink"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-5 py-3 text-left text-[14px] transition-colors hover:bg-holo-surface-2 ${
          danger ? "text-red-500" : "text-holo-ink"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center">{icon}</span>
        <span>{label}</span>
      </button>
    </li>
  );
}

function Thumbnail({ room }: { room: ChatRoom }) {
  return (
    <div className="relative">
      <GroupAvatar room={room} size="md" />
      {room.online && (
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79L4 14h16l-3.89-1.45A2 2 0 0 1 15 10.76V5h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H9z" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.31 5A6 6 0 0 1 18 8c0 3-1 4-2 5l1 4-2 1" />
      <path d="M18 8c0 7 3 9 3 9H8" />
      <path d="m2 2 20 20" />
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
    </svg>
  );
}
function ReadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
