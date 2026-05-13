import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CHAT_MESSAGES,
  CHAT_QUICK_EMOJIS,
  FRIENDS,
  type ChatMessage,
  type ChatMessageReaction,
  type ChatRoom,
  type MeetingInfo,
} from "@/shared/mock/data";
import {
  addMembersToRoom,
  getRoom,
  leaveRoomById,
  markRoomRead,
  useRooms,
} from "./rooms-store";
import {
  getMessagesForRoom,
  persistWithoutUnreadDivider,
} from "./messages-store";
import { getAvatarUrl } from "./avatars";

type ReplyTarget = { nickname: string; content: string } | null;

type Member = { id: string; nickname: string; isMe: boolean; isHost: boolean; isFriend: boolean };

// 방 정보로 멤버 리스트 동적 생성
function buildMembersFor(room: ChatRoom): Member[] {
  const friendNicks = new Set(FRIENDS.map((f) => f.nickname));
  const me: Member = { id: "me", nickname: "무지는 단무지", isMe: true, isHost: false, isFriend: false };
  if (!room.isGroup) {
    return [
      me,
      {
        id: "other",
        nickname: room.name,
        isMe: false,
        isHost: false,
        isFriend: friendNicks.has(room.name),
      },
    ];
  }

  // 1) 실제 초대된 멤버가 있으면 그걸 사용 (사용자가 새로 만든 방)
  let nicknames: string[];
  if (room.memberNames && room.memberNames.length > 0) {
    nicknames = room.memberNames;
  } else {
    // 2) 없으면 pool에서 memberCount-1만큼 채움 (mock 기존 방)
    const pool = [
      "감자튀김",
      "껍질은 달걀껍질",
      "멜론은 키위",
      "감자 없는 카레",
      "닭볶음탕수",
      "참치는 등푸른",
      "라면 한 봉지",
      "치즈볶이",
      "수박나라",
      "토마토킹",
      "당근소년",
    ];
    const otherCount = Math.max(0, room.memberCount - 1);
    nicknames = [];
    for (let i = 0; i < otherCount; i++) {
      nicknames.push(pool[i % pool.length]);
    }
  }

  const others: Member[] = nicknames.map((nickname, i) => ({
    id: `m-${room.id}-${i}`,
    nickname,
    isMe: false,
    isHost: i === 0, // 첫 번째 멤버를 방장으로
    isFriend: friendNicks.has(nickname),
  }));
  return [me, ...others];
}

// 방마다 다른 더미 메시지를 보여주기 위해 id 기반으로 살짝 변형
function buildMessagesFor(room: ChatRoom): ChatMessage[] {
  const memberPool = ["감자튀김", "껍질은 달걀껍질", "멜론은 키위", "감자 없는 카레"];
  const speaker = (i: number) => (room.isGroup ? memberPool[i % memberPool.length] : room.name);

  // 방금 생성된 새 방은 시스템 메시지만 (lastMessage 플레이스홀더로 식별)
  const isNewRoom = room.lastMessage === "(대화를 시작해보세요)";
  if (isNewRoom) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    return [
      {
        id: `${room.id}-sys`,
        nickname: "",
        content: `${room.name} 채팅방이 시작됐어요`,
        time: "",
        mine: false,
        date: todayStr,
        type: "system",
      },
    ];
  }

  const messages: ChatMessage[] = [
    {
      id: `${room.id}-sys`,
      nickname: "",
      content: `${room.name} 채팅방이 시작됐어요`,
      time: "",
      mine: false,
      date: "2026-05-08",
      type: "system",
    },
    {
      id: `${room.id}-1`,
      nickname: speaker(0),
      content: room.isGroup ? "안녕하세요 :D" : "안녕하세요!",
      time: "14:50",
      mine: false,
    },
    {
      id: `${room.id}-2`,
      nickname: "",
      content: room.isGroup ? "넵 반가워요~" : "오랜만이에요!",
      time: "14:55",
      mine: true,
      read: true,
    },
    {
      id: `${room.id}-3`,
      nickname: speaker(1),
      content: "오늘 시간 괜찮으세요?",
      time: "15:00",
      mine: false,
    },
  ];

  // 안 읽음 채울 더미 (마지막 한 칸은 room.lastMessage가 들어갈 자리)
  const unreadFiller: string[] = [
    "곧 나갈게요!",
    "위치 공유 보내드렸어요 📍",
    "도착하면 알려주세요",
    "오늘 진짜 기대돼요 ㅎㅎ",
    "다들 늦지 않게요!",
    "비가 와서 우산 챙기세요 ☔",
    "주차장 만석이에요 ㅠㅠ",
    "조심히 오세요",
    "거의 다 왔어요",
    "5분만 늦을게요 ㅠ",
    "괜찮습니다~ 천천히 오세요",
  ];

  if (room.unread > 0) {
    // 안 읽음 시작 구분선
    messages.push({
      id: `${room.id}-unread-divider`,
      nickname: "",
      content: `여기부터 새 메시지 ${room.unread}개`,
      time: "",
      mine: false,
      type: "system",
    });

    // unread - 1 개의 채움 메시지 (room.lastMessage 자리 하나 빼고)
    const fillerCount = Math.min(room.unread - 1, unreadFiller.length);
    for (let i = 0; i < fillerCount; i++) {
      messages.push({
        id: `${room.id}-u${i}`,
        nickname: speaker(i + 2),
        content: unreadFiller[i],
        time: `15:${(5 + i).toString().padStart(2, "0")}`,
        mine: false,
      });
    }

    // 마지막 안 읽음 메시지 = 목록 미리보기와 동일한 lastMessage
    messages.push({
      id: `${room.id}-last`,
      nickname: speaker(room.unread + 1),
      content: room.lastMessage,
      time: room.lastTime,
      mine: false,
    });
  } else {
    // 안 읽음 없음: 가장 최근 메시지로 lastMessage 한 줄만 추가
    // (이미 읽은 상태라 가정 → 상대가 보낸 마지막 메시지로 표시)
    messages.push({
      id: `${room.id}-last`,
      nickname: speaker(2),
      content: room.lastMessage,
      time: room.lastTime,
      mine: false,
    });
  }

  return messages;
}

export function ChatRoomScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // store 구독 (다른 화면에서 변경되더라도 반영)
  useRooms();
  const room = getRoom(id);

  // 진입 시 한 번만 메시지 빌드(읽음 처리 전 unread 카운트 기준)
  // 빌드 후 unread를 0으로 처리해서 목록의 배지가 사라지게 함
  const initialRoomRef = useRef<ChatRoom | undefined>(room);
  if (initialRoomRef.current?.id !== id) {
    // 라우트 변경으로 다른 방으로 이동했을 때
    initialRoomRef.current = room;
  }
  const [showInfo, setShowInfo] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [addedFriends, setAddedFriends] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState<{ title: string; description?: string; onConfirm?: () => void; danger?: boolean } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // 1) 캐시된 메시지가 있으면 그대로 복원 (재진입 시 이전 대화 유지)
    const cached = getMessagesForRoom(id);
    if (cached) return cached;
    // 2) 처음 진입이면 unread 기준으로 빌드
    return initialRoomRef.current
      ? buildMessagesFor(initialRoomRef.current)
      : CHAT_MESSAGES;
  });

  // 라우트 id가 바뀌면 메시지 갈아끼우고 읽음 처리
  useEffect(() => {
    if (!id) return;
    const cached = getMessagesForRoom(id);
    if (cached) {
      setMessages(cached);
    } else {
      const r = getRoom(id);
      if (r) setMessages(buildMessagesFor(r));
    }
    // 한 프레임 뒤에 unread = 0
    const t = window.setTimeout(() => markRoomRead(id), 0);
    return () => window.clearTimeout(t);
  }, [id]);

  // 메시지가 바뀔 때마다 store에 저장 (안 읽음 구분선은 제외 → 재진입 시 안 보임)
  useEffect(() => {
    if (id) persistWithoutUnreadDivider(id, messages);
  }, [id, messages]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<ReplyTarget>(null);

  const scrollRef = useRef<HTMLUListElement>(null);
  // 파일 input refs (각각 다른 accept/capture 옵션)
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새 메시지 시 하단 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        nickname: "",
        content: v,
        time,
        mine: true,
        replyTo: reply ?? undefined,
        read: false,
        readBy: 1,
      },
    ]);
    setText("");
    setReply(null);
    setShowEmoji(false);
    setShowAttach(false);
  };

  const addReaction = (id: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const list = [...(m.reactions ?? [])];
        const existing = list.find((r) => r.emoji === emoji);
        if (existing) {
          existing.count += existing.mine ? -1 : 1;
          existing.mine = !existing.mine;
          if (existing.count <= 0) {
            return { ...m, reactions: list.filter((r) => r !== existing) };
          }
        } else {
          list.push({ emoji, count: 1, mine: true });
        }
        return { ...m, reactions: list };
      }),
    );
    setReactionTarget(null);
  };

  // 그룹화: 날짜 구분선 + 검색 필터
  const grouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? messages.filter((m) => {
          if (m.type === "system") return false;
          const inContent = (m.content ?? "").toLowerCase().includes(q);
          const inNickname = (m.nickname ?? "").toLowerCase().includes(q);
          const inFile = (m.fileName ?? "").toLowerCase().includes(q);
          return inContent || inNickname || inFile;
        })
      : messages;
    const out: Array<{ kind: "date" | "msg"; data: any }> = [];
    let prev: string | undefined;
    filtered.forEach((m) => {
      if (!q && m.date && m.date !== prev) {
        out.push({ kind: "date", data: m.date });
        prev = m.date;
      }
      out.push({ kind: "msg", data: m });
    });
    return out;
  }, [messages, searchQuery]);

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return 0;
    return messages.filter((m) => {
      if (m.type === "system") return false;
      return (
        (m.content ?? "").toLowerCase().includes(q) ||
        (m.nickname ?? "").toLowerCase().includes(q) ||
        (m.fileName ?? "").toLowerCase().includes(q)
      );
    }).length;
  }, [messages, searchQuery]);

  const members = useMemo(() => {
    if (!room) return [];

    const baseMembers = buildMembersFor(room);

    const extraMembers: Member[] = addedFriends.map((nickname, i) => ({
      id: `added-${i}-${nickname}`,
      nickname,
      isMe: false,
      isHost: false,
      isFriend: true,
    }));

    return [...baseMembers, ...extraMembers];
  }, [room, addedFriends]);

  const displayRoomName = useMemo(() => {
    if (!room) return "채팅방";

    if (!room.isGroup && addedFriends.length > 0) {
      return `${room.name} 외 ${addedFriends.length}명`;
    }

    return room.name;
  }, [room, addedFriends]);

  const displayMemberCount = members.length;

  const nowTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 이미지 파일을 Data URL로 읽어 메시지에 추가
  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${idx}`,
            nickname: "",
            content: "",
            time: nowTime(),
            mine: true,
            type: "image",
            imageUrl: reader.result as string,
            read: false,
            readBy: 1,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 일반 파일을 메시지로 추가 (실제 업로드는 안 하고 메타데이터만)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file, idx) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${idx}`,
          nickname: "",
          content: "",
          time: nowTime(),
          mine: true,
          type: "file",
          fileName: file.name,
          fileSize: file.size,
          fileMime: file.type,
          read: false,
          readBy: 1,
        },
      ]);
    });
  };

  const handleLocationShare = () => {
    if (!("geolocation" in navigator)) {
      setAlert({ title: "위치 정보를 지원하지 않는 브라우저예요" });
      return;
    }
    setAlert({ title: "위치를 가져오는 중..." });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAlert(null);
        const { latitude, longitude } = pos.coords;
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            nickname: "",
            content: "",
            time: nowTime(),
            mine: true,
            type: "location",
            location: { lat: latitude, lng: longitude },
            read: false,
            readBy: 1,
          },
        ]);
      },
      (err) => {
        setAlert({
          title: "위치를 가져올 수 없어요",
          description: err.code === err.PERMISSION_DENIED
            ? "브라우저 설정에서 위치 권한을 허용해주세요."
            : "잠시 후 다시 시도해주세요.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onAttachPick = (kind: string) => {
    setShowAttach(false);
    switch (kind) {
      case "camera":
        cameraInputRef.current?.click();
        break;
      case "image":
        albumInputRef.current?.click();
        break;
      case "file":
        fileInputRef.current?.click();
        break;
      case "location":
        handleLocationShare();
        break;
      default:
        // voice/poll/pay/event는 추후 구현
        setAlert({
          title: "준비 중인 기능이에요",
          description: "곧 만나볼 수 있어요!",
        });
    }
  };

  return (
    <main
      className="relative flex flex-col overflow-hidden px-4 pt-3"
      style={{ height: "calc(100dvh - 72px)" }}
    >
      {/* 첨부용 hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleImageFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleImageFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <article className="relative mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-holo-card bg-white shadow-holo-card">
        {searchOpen ? (
          <header className="flex shrink-0 items-center gap-2 border-b border-holo-line bg-white px-3 py-2.5">
            <button
              type="button"
              aria-label="검색 닫기"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <BackIcon />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-full border border-holo-line-3 px-3 py-1.5">
              <SearchSmallIcon />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="대화 내용 검색"
                autoFocus
                className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="지우기"
                  onClick={() => setSearchQuery("")}
                >
                  <CloseSmallIcon />
                </button>
              )}
            </div>
          </header>
        ) : (
        <header className="flex shrink-0 items-center justify-between border-b border-holo-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
              <BackIcon />
            </button>
            <div className="relative">
              {room?.isGroup ? (
                <div className="grid h-9 w-9 grid-cols-2 gap-0.5 overflow-hidden rounded-[7px] bg-holo-surface-2 p-0.5">
                  {[0, 1, 2, 3].map((i) => (
                    <img
                      key={i}
                      src={getAvatarUrl((room?.name ?? "") + "_g" + i)}
                      alt=""
                      className="h-full w-full rounded-[3px] object-cover"
                    />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`${room?.name} 프로필 보기`}
                  onClick={() => room && navigate(`/profile/${encodeURIComponent(room.name)}`)}
                >
                  <img
                    src={getAvatarUrl(room?.name)}
                    alt=""
                    className="block h-9 w-9 rounded-full bg-holo-yellow-room object-cover"
                  />
                </button>
              )}
              {room?.online && (
                <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-white bg-green-500" />
              )}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-holo-ink">
                {displayRoomName}
              </p>
              <p className="text-[11px] text-holo-ink-3">
                {room
                  ? room.isGroup || addedFriends.length > 0
                    ? `멤버 ${displayMemberCount}명${room.online ? " · 활동 중" : ""}`
                    : room.online
                      ? "활동 중"
                      : "오프라인"
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="검색"
              onClick={() => setSearchOpen(true)}
              className="text-holo-ink-3"
            >
              <SearchSmallIcon />
            </button>
            <button type="button" aria-label="채팅방 정보" onClick={() => setShowInfo(true)}>
              <MenuIcon />
            </button>
          </div>
        </header>
        )}

        {/* 모임 정보 배너 (그룹 + meeting 정보가 있을 때만) */}
        {room?.meeting && (
          <button
            type="button"
            onClick={() => setShowMeeting(true)}
            className="flex w-full shrink-0 items-center gap-2 overflow-hidden border-b border-holo-line bg-holo-lilac-card/30 px-4 py-2 transition-colors hover:bg-holo-lilac-card/50"
          >
            <span className="shrink-0 text-[12px] font-semibold text-holo-purple-mid">
              {room.meeting.date} · {room.meeting.time}
            </span>
            <span className="text-holo-ink-4">·</span>
            <span className="flex flex-1 items-center gap-1 truncate text-left text-[12px] text-holo-ink-2">
              <PinSmallIcon />
              <span className="truncate">{room.meeting.place}</span>
            </span>
            <ChevronRightSmallIcon />
          </button>
        )}

        {searchOpen && searchQuery.trim() && (
          <div className="border-b border-holo-line bg-holo-surface-2 px-4 py-2 text-[12px] text-holo-ink-2">
            {searchHits > 0
              ? `"${searchQuery}" 검색 결과 ${searchHits}건`
              : `"${searchQuery}" 검색 결과가 없어요`}
          </div>
        )}

        <ul
          ref={scrollRef}
          className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-6"
          onClick={() => {
            setReactionTarget(null);
            setShowEmoji(false);
            setShowAttach(false);
          }}
        >
          {grouped.map((row, i) => {
            if (row.kind === "date") {
              return <DateDivider key={`d-${i}`} dateStr={row.data} />;
            }
            const m = row.data as ChatMessage;
            if (m.type === "system") {
              return (
                <li key={m.id} className="flex justify-center">
                  <span className="rounded-full bg-holo-surface-2 px-3 py-1 text-[11px] text-holo-ink-3">
                    {m.content}
                  </span>
                </li>
              );
            }
            return (
              <MessageItem
                key={m.id}
                message={m}
                onLongPress={(target) => setReactionTarget(target.id)}
                onReact={() => setReactionTarget(m.id)}
                showReactionPicker={reactionTarget === m.id}
                onPickEmoji={(e) => addReaction(m.id, e)}
                onProfileClick={(nickname) =>
                  navigate(`/profile/${encodeURIComponent(nickname)}`)
                }
              />
            );
          })}

        </ul>
      </article>

      {/* 입력바: article 바로 아래 flex 흐름. main의 px-4를 상쇄해 전폭 표시 */}
      <div className="-mx-4 shrink-0 border-t border-holo-line-3 bg-white ">
        {/* 답장 미리보기 */}
        {reply && (
          <div className="flex items-start gap-2 bg-holo-surface-2 px-3 py-2">
            <div className="w-1 self-stretch rounded bg-holo-purple-mid" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-semibold text-holo-purple-mid">
                {reply.nickname}님에게 답장
              </p>
              <p className="truncate text-[12px] text-holo-ink-3">{reply.content}</p>
            </div>
            <button type="button" aria-label="답장 취소" onClick={() => setReply(null)}>
              <CloseIcon />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 px-2 py-2"
          >
          <button
            type="button"
            aria-label="첨부"
            onClick={() => {
              setShowAttach((v) => !v);
              setShowEmoji(false);
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              showAttach ? "bg-holo-purple-mid text-white" : "text-holo-ink-3"
            }`}
          >
            <PlusIcon />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-holo-line-3 px-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="h-[34px] w-0 min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3"
            />
            <button
              type="button"
              aria-label="이모지"
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowAttach(false);
              }}
              className="text-[16px]"
            >
              😊
            </button>
          </div>
          <button
            type="submit"
            aria-label="전송"
            disabled={!text.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              text.trim()
                ? "bg-holo-gradient text-white"
                : "bg-holo-line-3 text-white"
            }`}
          >
            <SendIcon />
          </button>
        </form>

        {/* 첨부 패널 */}
        {showAttach && (
          <div className="grid grid-cols-4 gap-3 border-t border-holo-line-3 bg-holo-surface-2 px-4 py-3">
            <AttachItem icon="📷" label="카메라" onClick={() => onAttachPick("camera")} />
            <AttachItem icon="🖼️" label="앨범" onClick={() => onAttachPick("image")} />
            <AttachItem icon="📎" label="파일" onClick={() => onAttachPick("file")} />
            <AttachItem icon="📍" label="위치" onClick={() => onAttachPick("location")} />
          </div>
        )}

        {/* 이모지 picker */}
        {showEmoji && (
          <div className="border-t border-holo-line-3 bg-white px-3 py-2">
            <div className="grid grid-cols-8 gap-1">
              {[
                "😀","😁","😂","🤣","😊","😍","🥰","😎",
                "🤩","🤔","😴","😭","😡","🥳","🤗","🙌",
                "👍","👏","🙏","💪","🔥","💯","❤️","💜",
              ].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setText((t) => t + e)}
                  className="h-8 text-[20px]"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showInfo && room && (
        <ChatInfoModal
          roomName={displayRoomName}
          members={members}
          onClose={() => setShowInfo(false)}
          onAddFriend={(nickname) => setShowAddFriend(nickname)}
          onInvite={() => {
            setShowInfo(false);
            setShowInvite(true);
          }}
          onBlock={() => {
            setShowInfo(false);
            setAlert({
              title: `${room.name}님을 차단할까요?`,
              description:
                "차단하면 더 이상 메시지를 받지 않으며, 이 채팅방에서도 자동으로 나가집니다.",
              danger: true,
              onConfirm: () => {
                if (room) leaveRoomById(room.id);
                navigate("/chat");
              },
            });
          }}
          onReport={() => {
            setShowInfo(false);
            setAlert({
              title: "이 채팅방을 신고할까요?",
              description:
                "운영팀에서 검토 후 조치해드려요. 신고 시 이 채팅방에서 자동으로 나가집니다.",
              danger: true,
              onConfirm: () => {
                if (room) leaveRoomById(room.id);
                navigate("/chat");
              },
            });
          }}
          onLeave={() => {
            setShowInfo(false);
            setAlert({
              title: "채팅방을 나갈까요?",
              description: "대화 내용은 모두 사라지며 복구할 수 없어요.",
              danger: true,
              onConfirm: () => {
                if (room) leaveRoomById(room.id);
                navigate("/chat");
              },
            });
          }}
          onProfileClick={(nickname) => {
            setShowInfo(false);
            navigate(`/profile/${encodeURIComponent(nickname)}`);
          }}
        />
      )}

      {showMeeting && room?.meeting && (
        <MeetingInfoModal
          roomName={displayRoomName}
          meeting={room.meeting}
          members={members}
          onClose={() => setShowMeeting(false)}
          onProfileClick={(nickname) => {
            setShowMeeting(false);
            navigate(`/profile/${encodeURIComponent(nickname)}`);
          }}
        />
      )}

      {showInvite && room && (
        <InviteFriendsModal
          roomName={displayRoomName}
          existingNicknames={members.map((m) => m.nickname)}
          onClose={() => setShowInvite(false)}
          onInvite={(nicks) => {
            setShowInvite(false);
            if (nicks.length > 0 && room) {
              addMembersToRoom(room.id, nicks);
              // 채팅 안에 시스템 메시지로 안내
              const inviteText =
                nicks.length === 1
                  ? `${nicks[0]}님이 초대되었습니다`
                  : `${nicks[0]}님 외 ${nicks.length - 1}명이 초대되었습니다`;
              setMessages((prev) => [
                ...prev,
                {
                  id: `${room.id}-invite-${Date.now()}`,
                  nickname: "",
                  content: inviteText,
                  time: "",
                  mine: false,
                  type: "system",
                },
              ]);
            }
          }}
        />
      )}

      {alert && (
        <AlertModal
          title={alert.title}
          description={alert.description}
          danger={alert.danger}
          onConfirm={alert.onConfirm}
          onClose={() => setAlert(null)}
        />
      )}

      {showAddFriend && (
        <ConfirmModal
          message={
            <>
              <strong>{showAddFriend}</strong>님을 친구로 추가하시겠습니까?
            </>
          }
          onYes={() => {
            const friendName = showAddFriend;

            setAddedFriends((prev) => {
              if (prev.includes(friendName)) return prev;
              return [...prev, friendName];
            });

            setMessages((prev) => [
              ...prev,
              {
                id: `friend-added-${Date.now()}`,
                nickname: "",
                content: `${friendName}님이 대화상대에 추가되었습니다`,
                time: "",
                mine: false,
                type: "system",
              },
            ]);

            setShowAddFriend(null);
          }}
          onNo={() => setShowAddFriend(null)}
        />
      )}

      {actionTarget && (
        <MessageActionSheet
          target={actionTarget}
          onClose={() => setActionTarget(null)}
          onReply={() => {
            setReply({
              nickname: actionTarget.mine ? "나" : actionTarget.nickname || "상대",
              content: actionTarget.content || "[이미지]",
            });
            setActionTarget(null);
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(actionTarget.content || "").catch(() => {});
            setActionTarget(null);
          }}
          onReact={(e) => {
            addReaction(actionTarget.id, e);
            setActionTarget(null);
          }}
        />
      )}
    </main>
  );
}

function MessageItem({
  message,
  onLongPress,
  onReact,
  showReactionPicker,
  onPickEmoji,
  onProfileClick,
}: {
  message: ChatMessage;
  onLongPress: (m: ChatMessage) => void;
  onReact: () => void;
  showReactionPicker: boolean;
  onPickEmoji: (e: string) => void;
  onProfileClick: (nickname: string) => void;
}) {
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const startPress = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onLongPress(message);
    }, 450);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  // long press 직후 따라오는 click이 ul까지 버블링되어 피커를 즉시 닫는 것을 방지
  const handleClick = (e: React.MouseEvent) => {
    if (longPressFired.current) {
      e.stopPropagation();
      longPressFired.current = false;
    }
  };

  const bubbleBase =
    "max-w-[230px] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[14px] shadow-sm";

  const reactions = message.reactions ?? [];

  // 메시지 본문 렌더 함수 (mine/their 양쪽에서 재사용)
  const pressProps = {
    onMouseDown: startPress,
    onMouseUp: cancelPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    onClick: handleClick,
  };

  const renderBody = (mine: boolean) => {
    const maxW = mine ? "max-w-[230px]" : "max-w-[210px]";
    if (message.type === "image" && message.imageUrl) {
      return (
        <img
          src={message.imageUrl}
          alt=""
          className={`${maxW} rounded-2xl`}
          {...pressProps}
        />
      );
    }
    if (message.type === "file" && message.fileName) {
      return (
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className={`${maxW} flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm ${
            mine ? "bg-holo-lilac-deep" : "bg-white"
          }`}
          {...pressProps}
        >
          <FileIcon />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-[13px] font-medium text-holo-ink">
              {message.fileName}
            </span>
            <span className="text-[10px] text-holo-ink-3">
              {formatFileSize(message.fileSize ?? 0)}
            </span>
          </div>
        </a>
      );
    }
    if (message.type === "location" && message.location) {
      const { lat, lng } = message.location;
      // OpenStreetMap 정적 이미지 (공개 타일 사용)
      const mapSrc = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=300x180&markers=${lat},${lng},red-pushpin`;
      return (
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${maxW} flex flex-col overflow-hidden rounded-2xl shadow-sm ${
            mine ? "bg-holo-lilac-deep" : "bg-white"
          }`}
          {...pressProps}
        >
          <img
            src={mapSrc}
            alt="지도"
            className="h-[120px] w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="flex items-center gap-1.5 px-3 py-2">
            <PinSmallIcon />
            <span className="truncate text-[12px] text-holo-ink">
              {message.location.address ??
                `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
            </span>
          </div>
        </a>
      );
    }
    return (
      <span
        className={`${bubbleBase} ${mine ? "bg-holo-lilac-deep text-holo-ink" : "bg-white text-holo-ink"}`}
        {...pressProps}
        onDoubleClick={onReact}
      >
        {message.content}
      </span>
    );
  };

  if (message.mine) {
    return (
      <li className="flex flex-col items-end">
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-holo-ink-3">
              {message.read ? "읽음" : message.readBy ? `안 읽음 ${message.readBy}` : ""}
            </span>
            <span className="text-[10px] text-holo-ink-3">{message.time}</span>
          </div>
          <div className="relative">
            {message.replyTo && <ReplyPreview reply={message.replyTo} />}
            {renderBody(true)}
            {showReactionPicker && <ReactionPicker onPick={onPickEmoji} align="end" />}
          </div>
        </div>
        {reactions.length > 0 && (
          <div className="relative z-20 mt-0 mr-2">
            <ReactionList reactions={reactions} onClick={onReact} align="end" />
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-col items-start">
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`${message.nickname} 프로필 보기`}
          onClick={() => onProfileClick(message.nickname)}
          className="shrink-0"
        >
          <img
            src={getAvatarUrl(message.nickname)}
            alt=""
            className="h-9 w-9 rounded-full bg-holo-yellow-room object-cover transition-transform hover:scale-105"
          />
        </button>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onProfileClick(message.nickname)}
            className="text-left text-[11px] text-holo-ink-3 hover:underline"
          >
            {message.nickname}
          </button>
          <div className="mt-1 flex items-end gap-2">
            <div className="relative">
              {message.replyTo && <ReplyPreview reply={message.replyTo} />}
              {renderBody(false)}
              {showReactionPicker && <ReactionPicker onPick={onPickEmoji} />}
            </div>
            <span className="text-[10px] text-holo-ink-3">{message.time}</span>
          </div>
          {reactions.length > 0 && (
            <div className="relative z-20 mt-0 ml-2">
              <ReactionList reactions={reactions} onClick={onReact} align="start" />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function ReplyPreview({ reply }: { reply: { nickname: string; content: string } }) {
  return (
    <div className="mb-1 flex items-start gap-1.5 rounded-lg bg-holo-surface-2 px-2 py-1">
      <span className="w-0.5 self-stretch rounded bg-holo-purple-mid" />
      <div className="overflow-hidden">
        <p className="text-[10px] font-semibold text-holo-purple-mid">{reply.nickname}</p>
        <p className="truncate text-[11px] text-holo-ink-3">{reply.content}</p>
      </div>
    </div>
  );
}

function ReactionPicker({
  onPick,
  align = "start",
}: {
  onPick: (e: string) => void;
  align?: "start" | "end";
}) {
  return (
    <div
      className={`absolute -top-11 ${align === "end" ? "right-0" : "left-0"} z-[60] flex items-center gap-1 rounded-full border border-holo-line-3 bg-white px-2 py-1 shadow-lg`}
      onClick={(e) => e.stopPropagation()}
    >
      {CHAT_QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className="text-[18px] transition-transform hover:scale-125"
          onClick={(e2) => {
            e2.stopPropagation();
            onPick(e);
          }}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function ReactionList({
  reactions,
  onClick,
  align,
}: {
  reactions: ChatMessageReaction[];
  onClick: () => void;
  align: "start" | "end";
}) {
  return (
    <div
      className={`flex flex-wrap gap-1 ${align === "end" ? "justify-end" : "justify-start"}`}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${
            r.mine
              ? "border-holo-purple-mid bg-holo-lilac-soft text-holo-purple-mid"
              : "border-holo-line bg-white text-holo-ink-2"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}

function DateDivider({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  return (
    <li className="flex justify-center">
      <span className="rounded-full bg-holo-surface-2 px-3 py-1 text-[11px] text-holo-ink-3">
        {label}
      </span>
    </li>
  );
}

function AttachItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[22px] shadow-sm">
        {icon}
      </span>
      <span className="text-[11px] text-holo-ink-2">{label}</span>
    </button>
  );
}

function MessageActionSheet({
  target,
  onClose,
  onReply,
  onCopy,
  onReact,
}: {
  target: ChatMessage;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onReact: (e: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-2xl bg-white p-4 md:max-w-[360px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-holo-line-3" />
        <div className="mb-3 flex justify-between">
          {CHAT_QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="text-[24px]"
              onClick={() => onReact(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-holo-line">
          <SheetItem onClick={onReply}>답장하기</SheetItem>
          <SheetItem onClick={onCopy}>복사하기</SheetItem>
          <SheetItem onClick={onClose}>전달하기</SheetItem>
          <SheetItem onClick={onClose}>저장하기</SheetItem>
          {!target.mine && <SheetItem onClick={onClose} danger>신고하기</SheetItem>}
          {target.mine && <SheetItem onClick={onClose} danger>삭제하기</SheetItem>}
        </div>
      </div>
    </div>
  );
}

function SheetItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 text-left text-[14px] ${danger ? "text-red-500" : "text-holo-ink"}`}
    >
      {children}
    </button>
  );
}

function MeetingInfoModal({
  roomName,
  meeting,
  members,
  onClose,
  onProfileClick,
}: {
  roomName: string;
  meeting: MeetingInfo;
  members: Member[];
  onClose: () => void;
  onProfileClick?: (nickname: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[330px] rounded-[15px] bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <span className="text-[16px] font-semibold text-holo-ink">{roomName}</span>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        {/* 모임 정보 카드 */}
        <div className="mt-4 flex flex-col gap-2 rounded-holo-card bg-holo-lilac-card/40 p-4">
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">날짜</span>
            <span className="text-[13px] font-semibold text-holo-ink">{meeting.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">시간</span>
            <span className="text-[13px] font-semibold text-holo-ink">{meeting.time}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">장소</span>
            <span className="text-[13px] font-semibold text-holo-ink">{meeting.place}</span>
          </div>
        </div>

        {/* 참여자 */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-holo-ink">참여자</span>
          <span className="text-[14px] text-holo-ink-2">{members.length}명</span>
        </div>

        <ul className="mt-3 flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-holo-card bg-holo-surface-2 p-4">
          {members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => !m.isMe && onProfileClick?.(m.nickname)}
                disabled={m.isMe}
                className="flex w-full items-center gap-3 rounded-md p-1 transition-colors hover:bg-holo-line-3/50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <img
                  src={getAvatarUrl(m.nickname)}
                  alt=""
                  className="h-8 w-8 rounded-full bg-holo-yellow-room object-cover"
                />
                <span className="flex-1 text-left text-[14px] text-holo-ink">{m.nickname}</span>
                {m.isMe && (
                  <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">me</span>
                )}
                {m.isHost && <CrownIcon />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChatInfoModal({
  roomName,
  members,
  onClose,
  onAddFriend,
  onInvite,
  onBlock,
  onReport,
  onLeave,
  onProfileClick,
}: {
  roomName: string;
  members: Member[];
  onClose: () => void;
  onAddFriend: (nickname: string) => void;
  onInvite: () => void;
  onBlock: () => void;
  onReport: () => void;
  onLeave: () => void;
  onProfileClick?: (nickname: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[330px] rounded-[15px] bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <span className="text-[16px] font-semibold text-holo-ink">{roomName}</span>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-holo-ink">대화상대</span>
          <span className="text-[14px] text-holo-ink-2">{members.length}명</span>
        </div>

        <ul className="mt-3 flex max-h-[220px] flex-col gap-2 overflow-y-auto rounded-holo-card bg-holo-surface-2 p-4">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => !m.isMe && onProfileClick?.(m.nickname)}
                disabled={m.isMe}
                className="flex flex-1 items-center gap-3 rounded-md p-1 transition-colors hover:bg-holo-line-3/50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <img
                  src={getAvatarUrl(m.nickname)}
                  alt=""
                  className="h-8 w-8 rounded-full bg-holo-yellow-room object-cover"
                />
                <span className="flex-1 text-left text-[14px] text-holo-ink">{m.nickname}</span>
                {m.isMe && (
                  <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">me</span>
                )}
                {m.isHost && <CrownIcon />}
              </button>
              {!m.isMe && !m.isFriend && (
                <button
                  type="button"
                  aria-label="친구 추가"
                  onClick={() => onAddFriend(m.nickname)}
                  className="shrink-0 px-1 text-holo-purple-mid"
                >
                  <UserPlusIcon />
                </button>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onInvite}
          className="mt-4 h-[44px] w-full rounded-full bg-holo-gradient text-[14px] font-semibold text-white"
        >
          초대하기
        </button>

        <div className="mt-3 flex items-center justify-around text-[13px] text-holo-ink">
          <button type="button" onClick={onBlock}>차단하기</button>
          <span className="h-3 w-px bg-holo-line" />
          <button type="button" onClick={onReport}>신고하기</button>
          <span className="h-3 w-px bg-holo-line" />
          <button type="button" onClick={onLeave}>채팅방 나가기</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  message,
  onYes,
  onNo,
}: {
  message: React.ReactNode;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[300px] overflow-hidden rounded-[12px] bg-white">
        <p className="px-4 py-5 text-center text-[14px] text-holo-ink">{message}</p>
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

function InviteFriendsModal({
  roomName,
  existingNicknames,
  onClose,
  onInvite,
}: {
  roomName: string;
  existingNicknames: string[];
  onClose: () => void;
  onInvite: (nicknames: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  // 동일 닉네임 한 번만 + 이미 방에 있는 친구는 disabled
  const friends = useMemo(() => {
    const seen = new Set<string>();
    return FRIENDS.filter((f) => {
      if (seen.has(f.nickname)) return false;
      seen.add(f.nickname);
      return true;
    }).map((f) => ({
      ...f,
      already: existingNicknames.includes(f.nickname),
    }));
  }, [existingNicknames]);

  const filtered = useMemo(() => {
    if (!q.trim()) return friends;
    const lq = q.trim().toLowerCase();
    return friends.filter((f) => f.nickname.toLowerCase().includes(lq));
  }, [q, friends]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    const nicks = Array.from(selected)
      .map((id) => friends.find((f) => f.id === id)?.nickname)
      .filter((x): x is string => Boolean(x));
    onInvite(nicks);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[340px] flex-col overflow-hidden rounded-[15px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-holo-line px-4 py-3">
          <button type="button" onClick={onClose} className="text-[13px] text-holo-ink-3">
            취소
          </button>
          <span className="text-[15px] font-semibold text-holo-ink">친구 초대</span>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={submit}
            className={`text-[13px] font-semibold ${
              selected.size === 0 ? "text-holo-ink-3" : "text-holo-purple-mid"
            }`}
          >
            초대 ({selected.size})
          </button>
        </header>

        <div className="px-4 pb-2 pt-3">
          <p className="text-[12px] text-holo-ink-3">
            <span className="font-semibold text-holo-ink">{roomName}</span>에 초대할 친구를 선택해주세요
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-full border border-holo-line-3 px-3 py-1.5">
            <SearchSmallIcon />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="친구 검색"
              className="h-6 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {filtered.length === 0 ? (
            <li className="py-6 text-center text-[13px] text-holo-ink-3">
              친구가 없어요
            </li>
          ) : (
            filtered.map((f) => {
              const isSelected = selected.has(f.id);
              const disabled = f.already;
              return (
                <li
                  key={f.id}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                    disabled ? "opacity-40" : "cursor-pointer hover:bg-holo-surface-2"
                  }`}
                  onClick={() => !disabled && toggle(f.id)}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-holo-purple-mid bg-holo-purple-mid text-white"
                        : "border-holo-line"
                    }`}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                        <path d="m5 12 5 5 9-9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <img
                    src={getAvatarUrl(f.nickname)}
                    alt=""
                    className="h-9 w-9 rounded-full bg-holo-yellow-room object-cover"
                  />
                  <span className="flex-1 truncate text-[14px] text-holo-ink">{f.nickname}</span>
                  {disabled && (
                    <span className="text-[11px] text-holo-ink-3">이미 참여중</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function CloseSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function SearchSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function PinSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79L4 14h16l-3.89-1.45A2 2 0 0 1 15 10.76V5h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H9z" />
    </svg>
  );
}
function ChevronRightSmallIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFCB3B" stroke="#FFCB3B" strokeWidth="1" aria-hidden>
      <path d="m3 18 2-9 5 4 2-7 2 7 5-4 2 9z" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function formatPhone(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

function AlertModal({
  title,
  description,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] overflow-hidden rounded-[14px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      >
        <div className="px-5 pt-6 pb-2 text-center text-[15px] font-semibold leading-snug text-holo-ink">
          {title}
        </div>
        {description && (
          <div className="px-5 pb-5 text-center text-[13px] leading-snug text-holo-ink-2">
            {description}
          </div>
        )}
        <div className="flex bg-[#1A1A1A] text-white">
          {onConfirm && (
            <>
              <button
                type="button"
                onClick={() => { onConfirm(); onClose(); }}
                className={`flex-1 py-3 text-center text-[15px] font-medium ${danger ? "text-[#FF6B6B]" : ""}`}
              >
                네
              </button>
              <span className="w-px self-stretch bg-white/30" aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-center text-[15px] font-medium"
          >
            {onConfirm ? "아니오" : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
