import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CHAT_MESSAGES,
  CHAT_QUICK_EMOJIS,
  type ChatMessage,
  type ChatMessageReaction,
  type ChatRoom,
  type MeetingInfo,
} from "@/shared/mock/data";
import {
  sendFriendRequest,
  getFriends,
  useFriends,
} from "@/features/mypage/friends-store";
import {
  addMembersToRoom,
  getRoom,
  getRooms,
  leaveRoomById,
  markRoomRead,
  setRooms,
  useRooms,
} from "./rooms-store";
import {
  appendMessageToRoom,
  getMessagesForRoom,
  persistWithoutUnreadDivider,
} from "./messages-store";
import {
  addKickedMember,
  useKickedMap,
} from "./kicked-members-store";
import { postsStore } from "@/features/board/posts-store";
import { getAvatarUrl } from "./avatars";
import { GroupAvatar } from "./group-avatar";
import { LocationMap, LocationPicker } from "@/features/map/post-map";
import { ME_PERSONA } from "@/features/home/home-faces";
import { getProfile } from "@/shared/stores/profile-store";
import { ConfirmModal as SharedConfirmModal } from "@/shared/components/confirm-modal";

type ReplyTarget = { nickname: string; content: string } | null;

type Member = { id: string; nickname: string; isMe: boolean; isHost: boolean; isFriend: boolean };

/**
 * 멤버/메시지 아바타 url — 본인(현재 로그인 계정 닉네임) 은 홈/마이페이지와 동일한
 * profile-store 의 얼굴을 쓰고, 그 외는 닉네임 시드 기반 아바타로 폴백한다.
 * ME_PERSONA.name 은 데모용 고정값이라 테스트 계정에선 어긋난다.
 */
function memberAvatarSrc(nickname: string): string {
  const profile = getProfile();
  if (nickname === profile.nickname) {
    return profile.profileFace ?? ME_PERSONA.face;
  }
  return getAvatarUrl(nickname);
}

// 방 정보로 멤버 리스트 동적 생성
function buildMembersFor(room: ChatRoom): Member[] {
  const friendNicks = new Set(getFriends().map((f) => f.nickname));
  // 본인 멤버의 닉네임은 현재 로그인 계정(profile-store)을 사용한다.
  const me: Member = { id: "me", nickname: getProfile().nickname, isMe: true, isHost: false, isFriend: false };
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
      "고소한 감자",
      "보송보송한 햄찌",
      "새콤한 망고",
      "매콤한 떡볶이",
      "촉촉한 푸딩",
      "고소한 호빵",
      "쫄깃한 라면",
      "매콤한 만두",
      "달콤한 수박",
      "새콤한 토마토",
      "씩씩한 당근",
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
    // 방장 판정 — 모임방은 hostNickname(게시글 작성자) 과 일치하는 멤버.
    // hostNickname 이 없는 레거시 방은 첫 번째 멤버를 방장으로 fallback.
    isHost: room.hostNickname
      ? nickname === room.hostNickname
      : i === 0,
    isFriend: friendNicks.has(nickname),
  }));
  return [me, ...others];
}

// 방마다 다른 더미 메시지를 보여주기 위해 id 기반으로 살짝 변형
function buildMessagesFor(room: ChatRoom): ChatMessage[] {
  // 더미 메시지를 누가 보낸 것처럼 보일지 결정 — 실제 방 멤버(memberNames) 를 우선 사용.
  // 없으면 fallback 풀. 그래서 헤더 아바타·정보 모달 멤버와 채팅 본문의 닉네임이 어긋나지 않음.
  const fallbackPool = ["고소한 감자", "보송보송한 햄찌", "새콤한 망고", "매콤한 떡볶이"];
  const pool =
    room.memberNames && room.memberNames.length > 0
      ? room.memberNames
      : fallbackPool;
  const speaker = (i: number) =>
    room.isGroup ? pool[i % pool.length] : room.name;

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
  // 친구 추가 버튼(UserPlusIcon) 으로 새로 친구가 된 멤버들의 닉네임 집합.
  // 멤버 목록에는 추가/중복 등록을 하지 않고, 기존 멤버의 isFriend 플래그만 true 로 덮어쓴다.
  const [newlyAddedFriends, setNewlyAddedFriends] = useState<Set<string>>(
    () => new Set(),
  );
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  /** 전달 대상으로 선택된 메시지 — 비어있지 않으면 ForwardSheet 열림 */
  const [forwardTarget, setForwardTarget] = useState<ChatMessage | null>(null);
  /** 사진 풀스크린 뷰어 — 비어있지 않으면 모달 열림 */
  const [photoViewer, setPhotoViewer] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** 메시지 액션 토스트 — 짧게 떴다 사라지는 안내 */
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };
  const [showInvite, setShowInvite] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  /** 퇴장 투표 진행 상태 — 비어있지 않으면 모달 표시 */
  const [voteKick, setVoteKick] = useState<{
    target: string;
    /** "voting" → 진행중, "passed" → 만장일치, "rejected" → 부결 */
    phase: "selecting" | "voting" | "passed" | "rejected";
  } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState<{ title: string; description?: string; onConfirm?: () => void; danger?: boolean } | null>(null);

  // 위치 공유 picker 모달 상태
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locDraftPick, setLocDraftPick] = useState<{ lat: number; lng: number } | null>(null);
  const [locDraftAddress, setLocDraftAddress] = useState<string>("");

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

  // 마운트 시점의 마지막 메시지 id — 단순 입장만 했을 때는 updatedAt 을 갱신하지 않기 위함.
  const initialLastIdRef = useRef<string | null>(null);

  // 메시지가 바뀔 때마다 store에 저장 (안 읽음 구분선은 제외 → 재진입 시 안 보임)
  // + 채팅 리스트에 표시될 lastMessage / lastTime 도 같이 갱신
  useEffect(() => {
    if (!id) return;
    persistWithoutUnreadDivider(id, messages);

    // 시스템 메시지는 제외하고 가장 최근 메시지를 lastMessage 로 사용
    const lastReal = [...messages]
      .reverse()
      .find((m) => m.type !== "system");
    if (!lastReal) return;

    // 마운트 직후 첫 호출에서는 기준점만 잡고 updatedAt 갱신은 건너뛴다.
    const isFirstRun = initialLastIdRef.current === null;
    if (isFirstRun) {
      initialLastIdRef.current = lastReal.id;
    }
    const isNewActivity = !isFirstRun && lastReal.id !== initialLastIdRef.current;

    const preview =
      lastReal.type === "image"
        ? "[사진]"
        : lastReal.type === "file"
          ? `[파일] ${lastReal.fileName ?? ""}`
          : lastReal.type === "location"
            ? "[위치]"
            : lastReal.content || "";

    // 내가 방금 보낸 메시지면 현재 시각을 "오후 H:MM" 형식으로 갱신,
    // 그 외 (mock 초기 데이터 등) 는 기존 lastTime 유지.
    let nextLastTime: string | undefined;
    if (lastReal.mine) {
      const now = new Date();
      const h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const ampm = h < 12 ? "오전" : "오후";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      nextLastTime = `${ampm} ${h12}:${m}`;
    }

    setRooms((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              lastMessage: preview,
              lastTime: nextLastTime ?? r.lastTime,
              updatedAt: isNewActivity ? Date.now() : r.updatedAt,
            }
          : r,
      ),
    );
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
        // 보낸 직후엔 방의 모든 다른 멤버가 아직 안 읽은 상태 — memberCount - 1 (1:1=1, 5명방=4).
        readBy: Math.max(0, (room?.memberCount ?? 2) - 1),
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

  // 강퇴된 닉네임 set — 채팅방 멤버 리스트에서 제외하기 위해 구독
  const kickedMap = useKickedMap();
  const postIdFromRoom =
    room?.id.startsWith("meetup-") === true
      ? room.id.slice("meetup-".length)
      : undefined;
  const kickedSet = useMemo(() => {
    if (!postIdFromRoom) return new Set<string>();
    return new Set(kickedMap[postIdFromRoom] ?? []);
  }, [kickedMap, postIdFromRoom]);

  // 모임방의 경우 게시글에서 작성자를 가져와 멤버 리스트의 방장이 항상 작성자와 일치하도록 보장.
  // (옛 데이터는 room.hostNickname 이 비어있거나 memberNames 에서 작성자가 빠져있을 수 있음)
  const [postsTick, setPostsTick] = useState(0);
  useEffect(() => {
    return postsStore.subscribe(() => setPostsTick((t) => t + 1));
  }, []);
  void postsTick;

  const members = useMemo(() => {
    if (!room) return [];

    let baseMembers = buildMembersFor(room);

    // 모임방이면 게시글 작성자가 항상 멤버 리스트에 포함되고 방장으로 표시되도록 자동 보정
    if (postIdFromRoom) {
      const post = postsStore
        .getPosts()
        .find((p) => p.id === postIdFromRoom);
      const authorNick = room.hostNickname ?? post?.authorNickname;
      const myNick = getProfile().nickname;
      if (authorNick && authorNick !== myNick) {
        const hasAuthor = baseMembers.some(
          (m) => m.nickname === authorNick,
        );
        if (!hasAuthor) {
          // 멤버 리스트에 작성자가 빠져있으면 me 바로 뒤에 추가
          const myIdx = baseMembers.findIndex((m) => m.isMe);
          const friendNicks = new Set(getFriends().map((f) => f.nickname));
          const insertPos = myIdx + 1;
          baseMembers = [
            ...baseMembers.slice(0, insertPos),
            {
              id: `m-${room.id}-host`,
              nickname: authorNick,
              isMe: false,
              isHost: true,
              isFriend: friendNicks.has(authorNick),
            },
            ...baseMembers.slice(insertPos),
          ];
        }
        // 모임방 멤버의 isHost 는 무조건 authorNick 한 명만 true
        baseMembers = baseMembers.map((m) => ({
          ...m,
          isHost: !m.isMe && m.nickname === authorNick,
        }));
      }
    }

    // 강퇴된 멤버는 멤버 리스트에서 제외
    if (kickedSet.size > 0) {
      baseMembers = baseMembers.filter((m) => !kickedSet.has(m.nickname));
    }
    if (newlyAddedFriends.size === 0) return baseMembers;
    // 친구로 새로 등록한 멤버는 isFriend=true 로 덮어써서 "친구 추가" 버튼이 사라지게 함.
    return baseMembers.map((m) =>
      newlyAddedFriends.has(m.nickname) ? { ...m, isFriend: true } : m,
    );
  }, [room, newlyAddedFriends, kickedSet, postIdFromRoom, postsTick]);

  const displayRoomName = useMemo(() => {
    if (!room) return "채팅방";
    // 1:1 → 그룹으로 전환된 방은 memberNames 의 첫 번째가 원래 1:1 상대(room.name)와 같다.
    // 이 경우 제목에 "외 N명" 을 덧붙여 추가된 인원이 있음을 알린다.
    if (
      room.isGroup &&
      room.memberNames &&
      room.memberNames.length > 1 &&
      room.memberNames[0] === room.name
    ) {
      const others = room.memberNames.length - 1;
      return `${room.name} 외 ${others}명`;
    }
    return room.name;
  }, [room]);

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
            readBy: Math.max(0, (room?.memberCount ?? 2) - 1),
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
          readBy: Math.max(0, (room?.memberCount ?? 2) - 1),
        },
      ]);
    });
  };

  const handleLocationShare = () => {
    // 모달을 열고 사용자가 지도에서 위치를 선택하게 함
    setLocDraftPick(null);
    setLocDraftAddress("");
    setShowLocationPicker(true);
  };

  const useMyCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      // geolocation 미지원 — 사용자가 지도에서 직접 위치를 선택하도록 유지
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocDraftPick({ lat: latitude, lng: longitude });
      },
      () => {
        // 권한 거부/실패 — mock 좌표로 떨구지 않고 picking 상태 유지
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const sendPickedLocation = () => {
    if (!locDraftPick) return;
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        nickname: "",
        content: "",
        time: nowTime(),
        mine: true,
        type: "location",
        location: {
          lat: locDraftPick.lat,
          lng: locDraftPick.lng,
          address: locDraftAddress.trim() || undefined,
        },
        read: false,
        // 보낸 직후엔 방의 모든 다른 멤버가 아직 안 읽은 상태 — memberCount - 1 (1:1=1, 5명방=4).
        readBy: Math.max(0, (room?.memberCount ?? 2) - 1),
      },
    ]);
    setShowLocationPicker(false);
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
                <GroupAvatar room={room} size="sm" />
              ) : (
                <button
                  type="button"
                  aria-label={`${room?.name} 프로필 보기`}
                  onClick={() => room && navigate(`/profile/${encodeURIComponent(room.name)}`)}
                >
                  {room && <GroupAvatar room={room} size="sm" />}
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
                  ? room.isGroup
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
                memberCount={room?.memberCount ?? 2}
                onLongPress={(target) => setActionTarget(target)}
                onReact={() => setReactionTarget(m.id)}
                showReactionPicker={reactionTarget === m.id}
                onPickEmoji={(e) => addReaction(m.id, e)}
                onProfileClick={(nickname) =>
                  navigate(`/profile/${encodeURIComponent(nickname)}`)
                }
                onImageTap={(target) => {
                  // 현재 방의 모든 이미지 URL 을 시간순으로 모아서 뷰어에 넘김
                  const all = messages
                    .filter(
                      (mm) => mm.type === "image" && !!mm.imageUrl,
                    )
                    .map((mm) => mm.imageUrl as string);
                  const idx = all.indexOf(target.imageUrl ?? "");
                  setPhotoViewer({
                    images: all,
                    index: idx >= 0 ? idx : 0,
                  });
                }}
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
          // 채팅방 id 가 "meetup-{postId}" 형식이면 해당 게시글로 이동 가능.
          postId={
            room && room.id.startsWith("meetup-")
              ? room.id.slice("meetup-".length)
              : undefined
          }
          onClose={() => setShowMeeting(false)}
          onGoToPost={(postId) => {
            setShowMeeting(false);
            navigate(`/board/${postId}`);
          }}
          onVoteKick={() => {
            // 모임 정보 모달은 닫고 투표 모달로 전환
            setShowMeeting(false);
            setVoteKick({ target: "", phase: "selecting" });
          }}
          onProfileClick={(nickname) => {
            setShowMeeting(false);
            navigate(`/profile/${encodeURIComponent(nickname)}`);
          }}
          onShowOnMap={(postId) => {
            // 모임 정보 모달 닫고 지도로 이동 — focusPostId 쿼리로
            // map-screen 이 해당 게시글 위치에 마커/센터링 처리.
            setShowMeeting(false);
            navigate(`/map?focusPostId=${encodeURIComponent(postId)}`);
          }}
        />
      )}

      {voteKick && room && (
        <VoteKickModal
          phase={voteKick.phase}
          target={voteKick.target}
          // 본인 제외한 멤버만 후보
          candidates={members.filter((m) => !m.isMe).map((m) => m.nickname)}
          onSelectTarget={(nickname) => {
            setVoteKick({ target: nickname, phase: "voting" });
            // 데모 시뮬레이션 — 3초 뒤 70% 확률로 만장일치 통과
            window.setTimeout(() => {
              const passed = Math.random() > 0.3;
              setVoteKick({
                target: nickname,
                phase: passed ? "passed" : "rejected",
              });
              // 통과 시 실제 강퇴 처리
              if (passed && postIdFromRoom) {
                addKickedMember(postIdFromRoom, nickname);
                // 채팅방 자체에서도 memberNames 갱신
                setRooms((prev) =>
                  prev.map((r) =>
                    r.id === room.id
                      ? {
                          ...r,
                          memberCount: Math.max(1, r.memberCount - 1),
                          memberNames: (r.memberNames ?? []).filter(
                            (n) => n !== nickname,
                          ),
                        }
                      : r,
                  ),
                );
                // 시스템 메시지로 안내
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `kick-${Date.now()}`,
                    nickname: "",
                    content: `${nickname}님이 퇴장 투표 결과로 채팅방에서 나갔습니다`,
                    time: "",
                    mine: false,
                    type: "system",
                  },
                ]);
              }
            }, 3000);
          }}
          onClose={() => setVoteKick(null)}
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

      {showLocationPicker && (
        <div
          className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40"
          onClick={() => setShowLocationPicker(false)}
        >
          <div
            className="mt-auto flex h-[85%] flex-col overflow-hidden rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
              <button
                type="button"
                onClick={() => setShowLocationPicker(false)}
                className="text-[14px] text-holo-ink-2"
              >
                취소
              </button>
              <span className="text-[14px] font-semibold text-holo-ink">
                위치 보내기
              </span>
              <button
                type="button"
                onClick={sendPickedLocation}
                disabled={!locDraftPick}
                className="text-[14px] font-semibold text-holo-purple-mid disabled:opacity-40"
              >
                보내기
              </button>
            </div>

            <div className="relative flex-1">
              <LocationPicker value={locDraftPick} onChange={setLocDraftPick} />
              <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-holo-ink-2 shadow">
                지도를 탭해 위치를 선택하세요
              </p>
              <button
                type="button"
                onClick={useMyCurrentLocation}
                className="absolute bottom-3 right-3 z-[400] flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-holo-purple-mid shadow"
              >
                📍 내 위치
              </button>
            </div>

            <div className="shrink-0 border-t border-holo-line px-4 py-3">
              <label className="text-[12px] text-holo-ink-3" htmlFor="loc-address">
                장소 이름 (선택)
              </label>
              <input
                id="loc-address"
                type="text"
                value={locDraftAddress}
                onChange={(e) => setLocDraftAddress(e.target.value)}
                placeholder="예: 미금역 1번 출구"
                className="mt-1 w-full border-b border-holo-line py-2 text-[14px] outline-none placeholder:text-holo-ink-3"
              />
              {locDraftPick && (
                <p className="mt-2 text-[11px] text-holo-ink-3">
                  선택한 좌표: {locDraftPick.lat.toFixed(5)}, {locDraftPick.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <SharedConfirmModal
        open={alert !== null}
        message={alert?.title ?? ""}
        description={alert?.description}
        // onConfirm 이 있으면 확인/취소 2버튼 다이얼로그, 없으면 단일 확인 안내.
        singleAction={!alert?.onConfirm}
        onCancel={() => setAlert(null)}
        onConfirm={() => {
          alert?.onConfirm?.();
          setAlert(null);
        }}
      />

      <SharedConfirmModal
        open={showAddFriend !== null}
        message={
          <>
            <strong>{showAddFriend}</strong>님을 친구로 추가하시겠습니까?
          </>
        }
        confirmLabel="추가"
        onCancel={() => setShowAddFriend(null)}
        onConfirm={() => {
          const friendName = showAddFriend;
          if (!friendName) return;

          // 전역 친구 store 에 요청을 보낸다 — 실제 친구로는 상대 수락 후에 등록된다.
          const result = sendFriendRequest(friendName);

          setNewlyAddedFriends((prev) => {
            if (prev.has(friendName)) return prev;
            const next = new Set(prev);
            next.add(friendName);
            return next;
          });

          const systemMessage =
            result === "already-friend"
              ? `${friendName}님은 이미 친구예요`
              : result === "already-sent"
                ? `${friendName}님에게는 이미 친구 요청을 보냈어요`
                : result === "incoming-exists"
                  ? `${friendName}님이 먼저 친구 요청을 보냈어요. 친구 화면에서 수락해 보세요`
                  : result === "max-reached"
                    ? `친구 정원(30명)이 가득 찼어요. 기존 친구를 정리해 주세요`
                    : `${friendName}님에게 친구 요청을 보냈어요`;

          setMessages((prev) => [
            ...prev,
            {
              id: `friend-added-${Date.now()}`,
              nickname: "",
              content: systemMessage,
              time: "",
              mine: false,
              type: "system",
            },
          ]);

          setShowAddFriend(null);
        }}
      />

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
            const text = actionTarget.content || "";
            navigator.clipboard
              ?.writeText(text)
              .then(() => showToast("메시지를 복사했어요"))
              .catch(() => showToast("복사에 실패했어요"));
            setActionTarget(null);
          }}
          onForward={() => {
            setForwardTarget(actionTarget);
            setActionTarget(null);
          }}
          onSave={() => {
            if (actionTarget.type === "image" && actionTarget.imageUrl) {
              // 이미지는 새 탭에서 열어 저장 유도
              window.open(actionTarget.imageUrl, "_blank");
              showToast("이미지가 새 탭에서 열렸어요");
            } else {
              showToast("저장 기능은 곧 지원돼요");
            }
            setActionTarget(null);
          }}
          onDelete={() => {
            const targetId = actionTarget.id;
            setAlert({
              title: "이 메시지를 삭제할까요?",
              description: "삭제한 메시지는 복구할 수 없어요.",
              danger: true,
              onConfirm: () => {
                setMessages((prev) => prev.filter((m) => m.id !== targetId));
                showToast("메시지를 삭제했어요");
              },
            });
            setActionTarget(null);
          }}
          onReport={() => {
            const nickname = actionTarget.nickname || "상대";
            setAlert({
              title: `${nickname}님의 메시지를 신고할까요?`,
              description: "운영팀에서 검토 후 조치해 드려요.",
              onConfirm: () => showToast("신고가 접수되었어요"),
            });
            setActionTarget(null);
          }}
          onReact={(e) => {
            addReaction(actionTarget.id, e);
            setActionTarget(null);
            showToast(`${e} 반응을 남겼어요`);
          }}
        />
      )}

      {forwardTarget && (
        <ForwardSheet
          target={forwardTarget}
          currentRoomId={id ?? ""}
          onClose={() => setForwardTarget(null)}
          onSelect={(targetRoomId, targetRoomName) => {
            // 전달할 메시지 사본 만들기 — 새 id, 내가 보낸 것으로 표시, "전달" 플래그
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, "0");
            const mm = String(now.getMinutes()).padStart(2, "0");
            const forwarded: ChatMessage = {
              ...forwardTarget,
              id: `fwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              mine: true,
              nickname: "",
              time: `${hh}:${mm}`,
              date: undefined,
              read: false,
              readBy: undefined,
              reactions: undefined,
              replyTo: undefined,
              forwarded: true,
            };

            // 미리보기 텍스트 — 채팅 목록에 노출되는 lastMessage 용
            const preview =
              forwardTarget.type === "image"
                ? "[사진]"
                : forwardTarget.type === "file"
                  ? `[파일] ${forwardTarget.fileName ?? ""}`
                  : forwardTarget.type === "location"
                    ? "[위치]"
                    : forwardTarget.content || "";

            // 1) 대상 방이 현재 방이면 화면 메시지 배열에 바로 추가
            if (targetRoomId === id) {
              setMessages((prev) => [...prev, forwarded]);
            } else {
              // 2) 다른 방이면 messages-store 에 append
              appendMessageToRoom(targetRoomId, forwarded);
            }

            // 3) rooms-store 에 lastMessage / lastTime / updatedAt 반영
            setRooms((prev) =>
              prev.map((r) =>
                r.id === targetRoomId
                  ? {
                      ...r,
                      lastMessage: preview,
                      lastTime: "방금",
                      updatedAt: Date.now(),
                    }
                  : r,
              ),
            );

            setForwardTarget(null);
            showToast(`${targetRoomName}(으)로 전달했어요`);
          }}
        />
      )}

      {photoViewer && (
        <PhotoViewer
          images={photoViewer.images}
          initialIndex={photoViewer.index}
          onClose={() => setPhotoViewer(null)}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * 풀스크린 사진 뷰어 — 좌우 스와이프(터치/드래그) 또는 화살표 키로 이전·다음 사진 이동.
 * 채팅방 안의 모든 이미지 메시지 URL 을 시간순으로 받아서 표시한다.
 */
function PhotoViewer({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)),
  );
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);

  const goTo = (next: number) => {
    if (next < 0 || next >= images.length) return;
    setIndex(next);
    setDragX(0);
  };
  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  // 키보드 ← → ESC 지원
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // index 변화에 따라 goPrev/goNext 가 갱신되도록 의도적으로 의존성 명시 안함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    startX.current =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
  };
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (startX.current === null) return;
    const x =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragX(x - startX.current);
  };
  const handleTouchEnd = () => {
    if (startX.current === null) return;
    const threshold = 60;
    if (dragX > threshold) goPrev();
    else if (dragX < -threshold) goNext();
    else setDragX(0);
    startX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
    >
      {/* 상단 바 — 인덱스 표시 + 닫기 */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
        <span className="text-[13px] text-white/80">
          {index + 1} / {images.length}
        </span>
        <span className="h-8 w-8" aria-hidden />
      </div>

      {/* 이미지 영역 — 스와이프 제스처 */}
      <div
        className="flex flex-1 select-none items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={(e) => {
          if (startX.current !== null) handleTouchMove(e);
        }}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => {
          if (startX.current !== null) handleTouchEnd();
        }}
      >
        <img
          src={images[index]}
          alt={`사진 ${index + 1}`}
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform"
          style={{ transform: `translateX(${dragX}px)` }}
        />
      </div>

      {/* 데스크톱용 좌우 화살표 (모바일에선 스와이프) */}
      {index > 0 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="이전 사진"
          className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 md:flex"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label="다음 사진"
          className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 md:flex"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

      {/* 페이지 인디케이터 */}
      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 py-4">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
              aria-hidden
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageItem({
  message,
  memberCount,
  onLongPress,
  onReact,
  showReactionPicker,
  onPickEmoji,
  onProfileClick,
  onImageTap,
}: {
  message: ChatMessage;
  /** 방의 총 인원수 — 안 읽음 카운트 계산용. 1:1 방은 2, 단톡은 그 이상. */
  memberCount: number;
  onLongPress: (m: ChatMessage) => void;
  onReact: () => void;
  showReactionPicker: boolean;
  onPickEmoji: (e: string) => void;
  onProfileClick: (nickname: string) => void;
  onImageTap?: (m: ChatMessage) => void;
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
      // pressProps 의 onClick(handleClick)을 확장 — long-press 가 발화되지 않았으면
      // 사진 풀스크린 뷰어를 연다.
      const imageProps = {
        ...pressProps,
        onClick: (e: React.MouseEvent) => {
          if (longPressFired.current) {
            e.stopPropagation();
            longPressFired.current = false;
            return;
          }
          onImageTap?.(message);
        },
      };
      return (
        <img
          src={message.imageUrl}
          alt=""
          className={`${maxW} cursor-zoom-in rounded-2xl`}
          {...imageProps}
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
          <LocationMap
            location={{ lat, lng, placeName: message.location.address }}
            className="h-[120px]"
            preview
            showUserMarker={false}
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

  // 내가 보낸 메시지의 "안 읽음 N" — 카운트는 방 인원에서 나(보낸이) 를 뺀 값이 상한.
  //   상한 = max(0, memberCount - 1)
  //   실제 표시값 = message.readBy 가 있으면 그 값을 상한으로 클램프, 없으면 상한 그대로.
  //   1:1 방(memberCount=2) 에서는 상한이 1.
  const mineOthers = Math.max(0, memberCount - 1);
  const mineUnread =
    typeof message.readBy === "number"
      ? Math.min(message.readBy, mineOthers)
      : mineOthers;

  if (message.mine) {
    return (
      <li className="flex flex-col items-end">
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-end gap-0.5">
            {/* 읽지 않은 사람 수 — "안 읽음" / "읽음" 라벨 없이 숫자만 노출. 0이거나 read=true 면 비움. */}
            <span className="text-[10px] text-holo-ink-3">
              {!message.read && mineUnread > 0 ? mineUnread : ""}
            </span>
            <span className="text-[10px] text-holo-ink-3">{message.time}</span>
          </div>
          <div className="relative">
            {message.forwarded && <ForwardedLabel align="end" />}
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
            src={memberAvatarSrc(message.nickname)}
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
              {message.forwarded && <ForwardedLabel />}
              {message.replyTo && <ReplyPreview reply={message.replyTo} />}
              {renderBody(false)}
              {showReactionPicker && <ReactionPicker onPick={onPickEmoji} />}
            </div>
            {/* 친구 말풍선 — 읽지 않은 사람 수만 숫자로. 보낸이·나 제외한 상한(max(0, memberCount-2)).
                0 이면 라벨 자체를 숨겨 시간만 보인다. */}
            <div className="flex flex-col items-start gap-0.5">
              {(() => {
                const friendOthers = Math.max(0, memberCount - 2);
                const friendUnread =
                  typeof message.readBy === "number"
                    ? Math.min(message.readBy, friendOthers)
                    : friendOthers;
                if (friendUnread === 0) return null;
                return (
                  <span className="text-[10px] text-holo-ink-3">
                    {friendUnread}
                  </span>
                );
              })()}
              <span className="text-[10px] text-holo-ink-3">{message.time}</span>
            </div>
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
  onForward,
  onSave,
  onDelete,
  onReport,
  onReact,
}: {
  target: ChatMessage;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onSave: () => void;
  onDelete: () => void;
  onReport: () => void;
  onReact: (e: string) => void;
}) {
  // 텍스트가 아닌 메시지(이미지/파일/위치)는 복사 메뉴를 숨긴다.
  const hasText = !target.type || target.type === "text";
  // 이미지·파일만 저장 가능
  const canSave = target.type === "image" || target.type === "file";

  return (
    <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-2xl bg-white p-4 pb-6 md:max-w-[360px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-holo-line-3" />

        {/* 이모지 반응 행 — 기존 인라인 피커와 동일 이모지 세트 */}
        <div className="mb-2 flex justify-between rounded-2xl bg-holo-surface-2 px-3 py-2">
          {CHAT_QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`${e} 반응`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition active:scale-90 active:bg-white"
              onClick={() => onReact(e)}
            >
              {e}
            </button>
          ))}
        </div>

        {/* 미리보기 — 어떤 메시지에 대한 액션인지 보여줌 */}
        <div className="mt-3 mb-1 rounded-xl bg-holo-surface-2 px-3 py-2">
          <p className="text-[11px] text-holo-ink-3">
            {target.mine ? "나" : target.nickname || "상대"}
          </p>
          <p className="line-clamp-2 text-[12px] text-holo-ink-2">
            {target.type === "image"
              ? "[사진]"
              : target.type === "file"
                ? `[파일] ${target.fileName ?? ""}`
                : target.type === "location"
                  ? "[위치]"
                  : target.content}
          </p>
        </div>

        <div className="flex flex-col divide-y divide-holo-line">
          <SheetItem icon={<ReplyIcon />} onClick={onReply}>
            답장하기
          </SheetItem>
          {hasText && (
            <SheetItem icon={<CopyIcon />} onClick={onCopy}>
              복사하기
            </SheetItem>
          )}
          <SheetItem icon={<ForwardIcon />} onClick={onForward}>
            전달하기
          </SheetItem>
          {canSave && (
            <SheetItem icon={<SaveIcon />} onClick={onSave}>
              저장하기
            </SheetItem>
          )}
          {!target.mine && (
            <SheetItem icon={<FlagIcon />} onClick={onReport} danger>
              신고하기
            </SheetItem>
          )}
          {target.mine && (
            <SheetItem icon={<TrashIcon />} onClick={onDelete} danger>
              삭제하기
            </SheetItem>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetItem({
  icon,
  onClick,
  danger,
  children,
}: {
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 py-3 text-left text-[14px] ${danger ? "text-red-500" : "text-holo-ink"}`}
    >
      {icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

function ForwardedLabel({ align = "start" }: { align?: "start" | "end" }) {
  return (
    <div
      className={`mb-1 flex items-center gap-1 text-[10px] text-holo-ink-3 ${
        align === "end" ? "justify-end" : ""
      }`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m15 17 5-5-5-5" />
        <path d="M20 12H9a5 5 0 0 0-5 5v2" />
      </svg>
      <span>전달된 메시지</span>
    </div>
  );
}

function ForwardSheet({
  target,
  currentRoomId,
  onClose,
  onSelect,
}: {
  target: ChatMessage;
  currentRoomId: string;
  onClose: () => void;
  onSelect: (roomId: string, roomName: string) => void;
}) {
  const [query, setQuery] = useState("");
  // 현재 방 제외 + 핀된 방 우선 정렬
  const rooms = getRooms()
    .filter((r) => r.id !== currentRoomId)
    .filter((r) =>
      query.trim()
        ? r.name.toLowerCase().includes(query.trim().toLowerCase())
        : true,
    )
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  const preview =
    target.type === "image"
      ? "[사진]"
      : target.type === "file"
        ? `[파일] ${target.fileName ?? ""}`
        : target.type === "location"
          ? "[위치]"
          : target.content || "";

  return (
    <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
      <div
        className="absolute bottom-0 left-1/2 flex max-h-[80vh] w-full -translate-x-1/2 flex-col rounded-t-2xl bg-white p-4 pb-6 md:max-w-[360px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded bg-holo-line-3" />
        <p className="shrink-0 text-[15px] font-semibold text-holo-ink">
          전달할 채팅방 선택
        </p>

        {/* 전달할 메시지 미리보기 */}
        <div className="mt-2 shrink-0 rounded-xl bg-holo-surface-2 px-3 py-2">
          <p className="text-[11px] text-holo-ink-3">
            {target.mine ? "나" : target.nickname || "상대"}
          </p>
          <p className="line-clamp-2 text-[12px] text-holo-ink-2">{preview}</p>
        </div>

        {/* 검색 */}
        <div className="mt-3 shrink-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="채팅방 이름 검색"
            className="h-10 w-full rounded-full border border-holo-line bg-holo-surface-2 px-4 text-[13px] outline-none placeholder:text-holo-ink-3 focus:border-holo-purple-mid"
          />
        </div>

        {/* 채팅방 목록 */}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex h-[160px] items-center justify-center text-[13px] text-holo-ink-3">
              전달할 수 있는 채팅방이 없어요
            </div>
          ) : (
            <ul className="flex flex-col">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id, r.name)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition active:bg-holo-surface-2"
                  >
                    <img
                      src={getAvatarUrl(r.name)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1 truncate text-[14px] font-medium text-holo-ink">
                        {r.name}
                        {r.isGroup && (
                          <span className="text-[11px] text-holo-ink-3">
                            ({r.memberCount})
                          </span>
                        )}
                        {r.pinned && (
                          <span className="text-[10px] text-holo-purple-mid">
                            📌
                          </span>
                        )}
                      </span>
                      <span className="truncate text-[11px] text-holo-ink-3">
                        {r.subtitle}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-10 shrink-0 rounded-full border border-holo-line text-[13px] text-holo-ink-2"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function ReplyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 17 4 12l5-5" />
      <path d="M4 12h11a5 5 0 0 1 5 5v2" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
function ForwardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 17 5-5-5-5" />
      <path d="M20 12H9a5 5 0 0 0-5 5v2" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/**
 * 모임 채팅방 퇴장 투표 모달.
 * - selecting: 강퇴할 멤버 선택
 * - voting: 다른 멤버들이 투표하는 동안 진행률 애니메이션
 * - passed: 만장일치 통과 안내
 * - rejected: 일부 반대로 부결 안내
 */
function VoteKickModal({
  phase,
  target,
  candidates,
  onSelectTarget,
  onClose,
}: {
  phase: "selecting" | "voting" | "passed" | "rejected";
  target: string;
  candidates: string[];
  onSelectTarget: (nickname: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
      onClick={phase === "selecting" || phase !== "voting" ? onClose : undefined}
    >
      <div
        className="w-full max-w-[330px] rounded-[15px] bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <span className="text-[16px] font-semibold text-holo-ink">
            퇴장 투표
          </span>
          {phase !== "voting" && (
            <button type="button" aria-label="닫기" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
        </header>

        {/* 1) 대상 선택 */}
        {phase === "selecting" && (
          <>
            <p className="mt-3 text-[12px] text-holo-ink-3">
              퇴장 투표를 시작할 멤버를 선택해 주세요. 만장일치 찬성 시 채팅방에서 퇴장돼요.
            </p>
            {candidates.length === 0 ? (
              <p className="my-6 text-center text-[13px] text-holo-ink-3">
                투표할 수 있는 멤버가 없어요
              </p>
            ) : (
              <ul className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto rounded-holo-card bg-holo-surface-2 p-3">
                {candidates.map((nickname) => (
                  <li key={nickname}>
                    <button
                      type="button"
                      onClick={() => onSelectTarget(nickname)}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-white"
                    >
                      <img
                        src={memberAvatarSrc(nickname)}
                        alt=""
                        className="h-8 w-8 rounded-full bg-holo-yellow-room object-cover"
                      />
                      <span className="flex-1 text-[14px] text-holo-ink">
                        {nickname}
                      </span>
                      <span className="text-[12px] text-holo-error">
                        투표 시작
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* 2) 투표 진행 중 */}
        {phase === "voting" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-holo-lilac-card-2">
              <span className="text-[28px]">🗳️</span>
            </div>
            <p className="text-[15px] font-semibold text-holo-ink">
              <strong>{target}</strong>님 퇴장 투표 진행 중
            </p>
            <p className="text-center text-[12px] text-holo-ink-3">
              다른 멤버들이 투표하고 있어요.
              <br />
              잠시만 기다려주세요…
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-holo-line-3">
              <div className="h-full animate-pulse rounded-full bg-holo-purple-mid" />
            </div>
          </div>
        )}

        {/* 3) 만장일치 통과 */}
        {phase === "passed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-[40px]">✅</span>
            <p className="text-[15px] font-semibold text-holo-ink">
              만장일치 찬성!
            </p>
            <p className="text-[13px] text-holo-ink-3">
              <strong>{target}</strong>님이 채팅방에서 퇴장되었어요.
              <br />
              모집 인원도 1명 줄어듭니다.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 h-10 w-full rounded-holo-pill bg-holo-purple-mid text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        )}

        {/* 4) 부결 */}
        {phase === "rejected" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-[40px]">🙅</span>
            <p className="text-[15px] font-semibold text-holo-ink">투표 부결</p>
            <p className="text-[13px] text-holo-ink-3">
              일부 멤버가 반대해 <strong>{target}</strong>님은
              <br />
              계속 채팅방에 머무릅니다.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 h-10 w-full rounded-holo-pill bg-holo-ink text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingInfoModal({
  roomName,
  meeting,
  members,
  postId,
  onClose,
  onGoToPost,
  onVoteKick,
  onProfileClick,
  onShowOnMap,
}: {
  roomName: string;
  meeting: MeetingInfo;
  members: Member[];
  postId?: string;
  onClose: () => void;
  onGoToPost?: (postId: string) => void;
  onVoteKick?: () => void;
  onProfileClick?: (nickname: string) => void;
  /** 장소 옆 핀 아이콘 클릭 시 호출 — 지도 화면에서 모임 위치를 표시. */
  onShowOnMap?: (postId: string) => void;
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
            <span className="flex flex-1 items-center gap-1.5 text-[13px] font-semibold text-holo-ink">
              {meeting.place}
              {/* 장소가 "온라인" 인 모임은 지도에 띄울 실제 위치가 없으므로 핀 아이콘 숨김.
                  "온라인 / 분당 정자동" 처럼 오프라인 보조 장소가 함께 적힌 경우엔 노출. */}
              {postId &&
                onShowOnMap &&
                meeting.place.trim() !== "온라인" && (
                  <button
                    type="button"
                    aria-label="지도에서 보기"
                    onClick={() => onShowOnMap(postId)}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-holo-purple-mid transition active:scale-95 hover:bg-holo-lilac-card"
                  >
                    <MapPinIcon />
                  </button>
                )}
            </span>
          </div>
        </div>

        {/* 액션 버튼들 — 게시글 이동 + 퇴장 투표. 둘 다 모임방에서만 노출. */}
        {postId && (onGoToPost || onVoteKick) && (
          <div className="mt-3 flex gap-2">
            {onGoToPost && (
              <button
                type="button"
                onClick={() => onGoToPost(postId)}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-holo-pill border border-holo-purple-mid bg-white text-[12px] font-semibold text-holo-purple-mid transition active:scale-[0.98]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <path d="M9 7h6M9 11h6M9 15h4" />
                </svg>
                모임 게시글
              </button>
            )}
            {onVoteKick && members.length > 1 && (
              <button
                type="button"
                onClick={onVoteKick}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-holo-pill border border-holo-error/60 bg-white text-[12px] font-semibold text-holo-error transition active:scale-[0.98]"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                  <path d="M9 21V3" />
                </svg>
                퇴장 투표
              </button>
            )}
          </div>
        )}

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
                  src={memberAvatarSrc(m.nickname)}
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
                  src={memberAvatarSrc(m.nickname)}
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
  const allFriends = useFriends();

  // 동일 닉네임 한 번만 + 이미 방에 있는 친구는 disabled
  const friends = useMemo(() => {
    const seen = new Set<string>();
    return allFriends
      .filter((f) => {
        if (seen.has(f.nickname)) return false;
        seen.add(f.nickname);
        return true;
      })
      .map((f) => ({
        ...f,
        already: existingNicknames.includes(f.nickname),
      }));
  }, [allFriends, existingNicknames]);

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
/** 모임 정보 모달의 "장소" 옆에 표시되는 핀 아이콘. 클릭 시 지도에 위치 표시. */
function MapPinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
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

