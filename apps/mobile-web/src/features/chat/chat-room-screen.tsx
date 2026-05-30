import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CHAT_QUICK_EMOJIS,
  type ChatMessage,
  type ChatMessageReaction,
  type ChatRoom,
  type MeetingInfo,
} from "@/shared/mock/data";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
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
import { calcJoined } from "@/features/board/meetup-utils";
import { formatYyMmDd } from "@/shared/utils/format-date";
import { getAvatarUrl } from "./avatars";
import { GroupAvatar } from "./group-avatar";
import { LocationMap, LocationPicker } from "@/features/map/post-map";
import { ME_PERSONA } from "@/features/home/home-faces";
import { getProfile } from "@/shared/stores/profile-store";
import { ConfirmModal as SharedConfirmModal } from "@/shared/components/confirm-modal";
import { uploadPhotoToStorage } from "@/shared/lib/storage-upload";

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
  // 모임 채팅방(meetup-*)은 절대 1:1 로 취급하지 않는다.
  // (과거 is_group 미저장으로 Supabase 에서 복원된 모임방이 1:1 로 잡혀,
  //  room.name(=게시글 제목)이 상대 유저처럼 멤버에 끼던 버그 방지 —
  //  모임방은 항상 그룹 경로로 멤버를 도출한다.)
  const isMeetupRoom = room.id.startsWith("meetup-");
  if (!room.isGroup && !isMeetupRoom) {
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
    // 2) memberNames 없음 — 실제 멤버 정보 없으므로 빈 배열 (가짜 닉네임 사용 안 함)
    nicknames = [];
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

/** 실시간 퇴장 투표 제한시간(초) — 사장님 확정값. */
const VOTE_DURATION_SEC = 30;
/**
 * 모임 해산 시 messages 테이블에 영구 저장하는 시스템 메시지.
 * 재입장/타기기에서 이 문구를 가진 메시지가 있으면 "해산됨"으로 복원해 채팅을 잠근다.
 * (chat_rooms 에 disbanded 컬럼을 추가하지 않고 SQL 없이 영속화하는 방식.)
 */
const DISBAND_SYSTEM_TEXT =
  "🚫 방장이 강퇴되어 모임이 해산되었어요. 더 이상 대화할 수 없어요.";

/** 투표 브로드캐스트 페이로드 — room-${id} 채널의 'vote' 이벤트로 주고받는다. */
type VotePayload =
  | { type: "start"; voteId: string; target: string; initiator: string; eligible: number }
  | { type: "cast"; voteId: string; voter: string; choice: "yes" | "no" }
  | { type: "result"; voteId: string; target: string; passed: boolean; disband: boolean };

/**
 * Supabase messages 행 → ChatMessage 의 부가 필드(type/파일/위치/답장/전달) 매핑.
 * 2026-05-30 마이그레이션으로 추가된 컬럼(msg_type, file_name/size, lat·lng, place_name,
 * reply_to, reactions, forwarded_from)을 복원한다. 컬럼/값이 없으면 빈 객체라 기존
 * 텍스트·이미지 메시지에는 영향이 없다. 초기 로드와 실시간 INSERT 두 경로에서 동일하게 사용.
 */
function chatExtrasFromRow(row: any): Partial<ChatMessage> {
  const extras: Partial<ChatMessage> = {};
  if (row.image_url) {
    extras.type = "image";
    extras.imageUrl = row.image_url;
  } else if (row.msg_type === "file" || row.file_name) {
    extras.type = "file";
    if (row.file_name) extras.fileName = row.file_name;
    if (row.file_size != null) extras.fileSize = Number(row.file_size);
  } else if (row.msg_type === "location" || (row.lat != null && row.lng != null)) {
    extras.type = "location";
    extras.location = {
      lat: Number(row.lat),
      lng: Number(row.lng),
      address: row.place_name ?? undefined,
    };
  } else if (row.msg_type) {
    extras.type = row.msg_type as ChatMessage["type"];
  }
  if (row.reply_to && typeof row.reply_to === "object") {
    extras.replyTo = row.reply_to as ChatMessage["replyTo"];
  }
  if (Array.isArray(row.reactions) && row.reactions.length > 0) {
    // mine 은 보는 사람마다 다르므로 DB 값은 무시하고 공유 카운트만 복원.
    extras.reactions = (row.reactions as any[]).map((r) => ({
      emoji: r.emoji,
      count: r.count,
    }));
  }
  if (row.forwarded_from) extras.forwarded = true;
  return extras;
}

/**
 * ChatMessage 를 messages 테이블 행으로 저장(best-effort).
 * 파일/위치/전달 메시지는 그동안 Supabase insert 가 아예 없어 재입장 시 사라졌다 —
 * 이 헬퍼로 일원화한다. 새 컬럼 미적용 환경(42703/PGRST204)이면 기본 컬럼만으로 재시도.
 */
function saveMessageRow(
  roomId: string,
  userPhone: string,
  m: ChatMessage,
): void {
  const base: Record<string, any> = {
    message_id: m.id,
    room_id: roomId,
    sender_phone: userPhone,
    sender_nickname: m.nickname || "",
    content: m.content ?? "",
    sent_time: m.time,
    read_by: [],
    ...(m.imageUrl ? { image_url: m.imageUrl } : {}),
  };
  const full: Record<string, any> = { ...base };
  if (m.type) full.msg_type = m.type;
  if (m.fileName) full.file_name = m.fileName;
  if (m.fileSize != null) full.file_size = m.fileSize;
  if (m.location) {
    full.lat = m.location.lat;
    full.lng = m.location.lng;
    full.place_name = m.location.address ?? null;
  }
  if (m.replyTo) full.reply_to = m.replyTo;
  if (m.forwarded) full.forwarded_from = "1";

  supabase
    .from("messages")
    .insert(full)
    .then(({ error }) => {
      if (error && (error.code === "42703" || error.code === "PGRST204")) {
        return supabase.from("messages").insert(base);
      }
      return { error };
    })
    .then((res: any) => {
      if (res && res.error) console.warn("Supabase 메시지 저장 실패:", res.error.message);
    });
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
    voteId?: string;
    target: string;
    /** "voting" → 진행중, "passed" → 만장일치, "rejected" → 부결 */
    phase: "selecting" | "voting" | "passed" | "rejected";
    /** 내가 이 투표를 시작했는지(집계 권한자) */
    amInitiator?: boolean;
    /** 내가 투표 대상인지(투표 불가, 결과만 본다) */
    amTarget?: boolean;
    /** 내가 던진 표 — undefined 면 아직 미투표(찬성/반대 버튼 노출) */
    myVote?: "yes" | "no";
    /** 모달에 표시할 남은 시간(초) */
    remainSec?: number;
  } | null>(null);
  /** 모임 해산됨 — 입력 잠금. messages 의 해산 시스템 메시지로 복원된다. */
  const [disbanded, setDisbanded] = useState(false);
  /** room-${id} 실시간 채널 핸들 — 투표 브로드캐스트 송신용. */
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /**
   * 진행 중 투표 집계 — 시작자(권한자)만 채운다. 찬성/반대 닉네임 set 으로 중복표를 막고,
   * 반대 1표면 즉시 부결, 찬성이 eligible 전원이면 즉시 가결, 아니면 타이머 만료 시 확정.
   */
  const voteTallyRef = useRef<{
    voteId: string;
    target: string;
    yes: Set<string>;
    no: Set<string>;
    eligible: number;
    timer: number | null;
  } | null>(null);
  /** 최신 멤버/방 정보 — [id] 의존 실시간 effect 안에서 stale 없이 읽기 위한 ref. */
  const membersRef = useRef<Member[]>([]);
  /** 최신 투표 브로드캐스트 핸들러 — 채널 effect 가 stale 클로저를 쓰지 않도록 ref 경유. */
  const voteHandlerRef = useRef<(p: VotePayload) => void>(() => {});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [alert, setAlert] = useState<{ title: string; description?: string; onConfirm?: () => void; danger?: boolean } | null>(null);

  // 위치 공유 picker 모달 상태
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locDraftPick, setLocDraftPick] = useState<{ lat: number; lng: number } | null>(null);
  const [locDraftAddress, setLocDraftAddress] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // 1) 캐시 있으면 그대로 복원 (재진입 시 이전 대화 유지)
    const cached = getMessagesForRoom(id);
    if (cached) return cached;
    // 2) 처음 진입: 시스템 메시지를 즉시 표시 (Supabase 로드 완료 전에도 보임)
    //    initialRoomRef 는 이미 line 267에서 설정됨
    const r = initialRoomRef.current;
    if (!r) return [];
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return [{
      id: `${r.id}-sys`,
      nickname: "",
      content: `${r.name} 채팅방이 시작됐어요`,
      time: "",
      mine: false,
      date: todayStr,
      type: "system" as const,
    }];
  });

  // 라우트 id가 바뀌면 메시지 갈아끼우고 읽음 처리
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const loadFromSupabase = async () => {
      const r = getRoom(id);

      const { data: rows, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn("Supabase 메시지 조회 실패:", error.message);
        const cached = getMessagesForRoom(id);
        if (cached) { setMessages(cached); return; }
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const sysMsg: ChatMessage[] = r ? [{
          id: `${r.id}-sys`, nickname: "", content: `${r.name} 채팅방이 시작됐어요`,
          time: "", mine: false, date: todayStr, type: "system" as ChatMessage["type"],
        }] : [];
        setMessages(sysMsg);
        return;
      }

      const userPhone = getCurrentAccount();
      const memberCount = latestMemberCountRef.current;
      const remote: ChatMessage[] = (rows ?? []).map((row: any) => {
        // created_at → 날짜 구분선용 date 필드 (YYYY-MM-DD)
        const createdAt = row.created_at ? new Date(row.created_at) : new Date();
        const date = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
        const isMine = row.sender_phone === userPhone;
        // read_by 배열 기반 실제 미읽음 수 계산 (내 메시지만 표시)
        const readByArr: string[] = Array.isArray(row.read_by) ? row.read_by : [];
        const readBy = isMine
          ? Math.max(0, memberCount - 1 - readByArr.length)
          : undefined;
        return {
          id: String(row.message_id ?? row.id),
          nickname: row.sender_nickname ?? "",
          content: row.content ?? "",
          time: row.sent_time ?? "",
          mine: isMine,
          date,
          readBy,
          // 이미지/파일/위치/답장/전달 부가 필드 복원 — 실시간 INSERT 핸들러와 동일 매핑.
          // (이전엔 image 만 복원해 파일·위치 메시지는 재입장 시 빈 말풍선으로 깨졌다.)
          ...chatExtrasFromRow(row),
        };
      });

      // 시스템 메시지("채팅방이 시작됐어요") — 첫 실제 메시지와 같은 날짜,
      // 메시지 없으면 오늘 날짜 사용 (하드코딩 날짜 제거)
      const firstDate = remote.length > 0 ? remote[0].date : (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();
      const sysMsg: ChatMessage[] = r ? [{
        id: `${r.id}-sys`,
        nickname: "",
        content: `${r.name} 채팅방이 시작됐어요`,
        time: "",
        mine: false,
        date: firstDate,
        type: "system" as ChatMessage["type"],
      }] : [];
      const combined = [...sysMsg, ...remote];
      setMessages(combined);
      persistWithoutUnreadDivider(id, combined);
      // 해산 시스템 메시지가 있으면 채팅 잠금 상태로 복원(재입장/타기기).
      setDisbanded((rows ?? []).some((r: any) => r.content === DISBAND_SYSTEM_TEXT));
    };

    loadFromSupabase();

    // 채팅방 진입 시: 상대방이 보낸 메시지를 읽음 처리 (Supabase RPC)
    // + 로컬 unread 배지도 0으로 초기화
    const userPhone = getCurrentAccount();
    if (userPhone && id) {
      supabase.rpc("mark_room_messages_read", {
        p_room_id: id,
        p_user_phone: userPhone,
      }).then(({ error }) => {
        if (error) console.warn("읽음 처리 실패:", error.message);
      });
    }
    const t = window.setTimeout(() => markRoomRead(id), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [id]);

  // ── 실시간 구독 ─────────────────────────────────────────────
  // INSERT: 새 메시지 즉시 표시 (중복 방지)
  // UPDATE: read_by 변경 시 readBy 숫자 실시간 갱신 → "1" 배지 제거
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`room-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const userPhone = getCurrentAccount();
          const isMine = row.sender_phone === userPhone;
          const readByArr: string[] = Array.isArray(row.read_by) ? row.read_by : [];
          const newMsg: ChatMessage = {
            id: String(row.message_id ?? row.id),
            nickname: row.sender_nickname ?? "",
            content: row.content ?? "",
            time: row.sent_time ?? "",
            mine: isMine,
            readBy: isMine ? Math.max(0, latestMemberCountRef.current - 1 - readByArr.length) : undefined,
            ...chatExtrasFromRow(row),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // 다른 멤버 기기에서 해산이 확정돼 시스템 메시지가 들어오면 이쪽도 채팅 잠금.
          if (row.content === DISBAND_SYSTEM_TEXT) setDisbanded(true);
          // 방 화면을 보고 있는 동안 받은 메시지도 즉시 읽음 처리 — 안 하면 상대 화면의
          // 안읽음 배지가 방을 나갔다 들어오기 전까지 안 사라진다.
          if (
            !isMine &&
            userPhone &&
            id &&
            (typeof document === "undefined" || document.visibilityState === "visible")
          ) {
            supabase
              .rpc("mark_room_messages_read", { p_room_id: id, p_user_phone: userPhone })
              .then(({ error }) => {
                if (error) console.warn("읽음 처리 실패:", error.message);
              });
            markRoomRead(id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          // read_by 배열이 바뀌면 해당 메시지의 readBy 숫자를 재계산
          const row = payload.new as any;
          const msgId = String(row.message_id ?? row.id);
          const readByArr: string[] = Array.isArray(row.read_by) ? row.read_by : [];
          const newReadBy = Math.max(0, latestMemberCountRef.current - 1 - readByArr.length);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId && m.mine
                ? { ...m, readBy: newReadBy }
                : m,
            ),
          );
        },
      )
      // 실시간 퇴장 투표 — 접속 중인 멤버들끼리 찬/반을 주고받는다(브로드캐스트).
      .on("broadcast", { event: "vote" }, ({ payload }) => {
        voteHandlerRef.current(payload as VotePayload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // 마운트 시점의 마지막 메시지 id — 단순 입장만 했을 때는 updatedAt 을 갱신하지 않기 위함.
  const initialLastIdRef = useRef<string | null>(null);
  // 안읽음 수 계산용 멤버수 단일 출처 — 전송/로드/실시간이 모두 같은 (보정된) 멤버수를 쓰도록
  // members.length 를 ref 로 동기화한다. (loadFromSupabase/실시간 effect 는 members 보다 먼저
  // 정의되지만, 실제 읽기는 메시지 도착 시점 런타임이라 최신 값이 안전하게 잡힌다.)
  const latestMemberCountRef = useRef(2);

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

    // 내가 보낸 메시지 또는 새로 도착한 수신 메시지면 현재 시각을 "오후 H:MM" 으로 갱신.
    // (이전엔 mine 일 때만 갱신해, 받은 메시지로는 시간이 멈춰 리스트 정렬(최상단)과 어긋났다.)
    // isNewActivity 게이트라 마운트 첫 호출/mock 초기 데이터는 그대로 유지된다.
    let nextLastTime: string | undefined;
    if (lastReal.mine || isNewActivity) {
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
    if (disbanded) return; // 해산된 모임은 전송 불가
    const v = text.trim();
    if (!v) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const msgId = String(Date.now());
    const myNickname = getProfile().nickname;
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        nickname: myNickname,
        content: v,
        time,
        mine: true,
        replyTo: reply ?? undefined,
        read: false,
        // 보낸 직후엔 방의 모든 다른 멤버가 아직 안 읽은 상태 — memberCount - 1 (1:1=1, 5명방=4).
        readBy: Math.max(0, displayMemberCount - 1),
      },
    ]);
    setText("");
    setReply(null);
    setShowEmoji(false);
    setShowAttach(false);

    // Supabase에 메시지 저장 (best-effort)
    const userPhone = getCurrentAccount();
    if (userPhone && id) {
      const baseTextRow = {
        message_id: msgId,
        room_id: id,
        sender_phone: userPhone,
        sender_nickname: myNickname,
        content: v,
        sent_time: time,
        read_by: [],  // 발송 시 아무도 읽지 않은 상태
      };
      // 답장 컨텍스트(reply_to) 도 함께 저장 — 안 하면 재입장 시 "어떤 메시지에 답장인지"가
      // 사라진다. 컬럼 미적용 환경이면 기본 컬럼만으로 재시도.
      const textRow = reply ? { ...baseTextRow, reply_to: reply } : baseTextRow;
      supabase
        .from("messages")
        .insert(textRow)
        .then(({ error }) => {
          if (error && (error.code === "42703" || error.code === "PGRST204")) {
            return supabase.from("messages").insert(baseTextRow);
          }
          return { error };
        })
        .then((res: any) => {
          if (res && res.error) console.warn("Supabase 메시지 저장 실패:", res.error.message);
        });
    }
  };

  const addReaction = (id: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const list = m.reactions ?? [];
        const has = list.some((r) => r.emoji === emoji);
        // 이전 state/캐시와 공유되는 reaction 객체를 직접 변형하지 않고 새 객체로 대체한다.
        // (StrictMode 의 업데이터 이중 호출 시 in-place 변형은 카운트가 ±2 로 어긋난다.)
        const next = has
          ? list
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine }
                  : r,
              )
              .filter((r) => r.count > 0)
          : [...list, { emoji, count: 1, mine: true }];
        return { ...m, reactions: next };
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
    // 로컬에서 갓 보낸 메시지/시스템 메시지는 date 가 비어 있다 — 오늘 날짜로 폴백해야
    // 어제 구분선 아래에 잘못 묶이지 않고 새 '오늘' 구분선이 생긴다(Supabase 재로딩 결과와 일치).
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    let prev: string | undefined;
    filtered.forEach((m) => {
      const d = m.date || todayStr;
      if (!q && d !== prev) {
        out.push({ kind: "date", data: d });
        prev = d;
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
  // 읽음수 계산(로드/실시간 effect)이 참조할 최신 멤버수 동기화.
  latestMemberCountRef.current = displayMemberCount;
  // 실시간 effect 의 stale 클로저 방지용으로 최신 멤버 리스트를 ref 에 보관.
  membersRef.current = members;

  // ── 실시간 만장일치 퇴장 투표 ──────────────────────────────
  // 방장(=게시글 작성자) 닉네임. 대상이 방장이면 가결 시 "해산"으로 처리한다.
  const hostNickname = useMemo(() => {
    if (!room) return undefined;
    if (room.hostNickname) return room.hostNickname;
    if (postIdFromRoom) {
      return postsStore.getPosts().find((p) => p.id === postIdFromRoom)?.authorNickname;
    }
    return undefined;
  }, [room, postIdFromRoom, postsTick]);

  /** room-${id} 채널로 투표 이벤트 송신(best-effort). */
  const broadcastVote = (payload: VotePayload) => {
    channelRef.current?.send({ type: "broadcast", event: "vote", payload });
  };

  /** 강퇴 적용 — 모든 기기에서 동일 실행(멤버 리스트/방 인원 정리). 로컬 store 라 기기별. */
  const applyKick = (nickname: string) => {
    if (postIdFromRoom) addKickedMember(postIdFromRoom, nickname);
    if (room) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === room.id
            ? {
                ...r,
                memberCount: Math.max(1, r.memberCount - 1),
                memberNames: (r.memberNames ?? []).filter((n) => n !== nickname),
              }
            : r,
        ),
      );
    }
  };

  /** 모임 모집 마감(②) — 게시글 status 를 모집완료로. */
  const closeRecruiting = () => {
    if (!postIdFromRoom) return;
    const post = postsStore.getPosts().find((p) => p.id === postIdFromRoom);
    if (post && post.status !== "모집완료") {
      postsStore.update({ ...post, status: "모집완료" });
    }
  };

  /**
   * 투표 결과 적용 — 가결 시 강퇴, 대상이 방장이면 해산까지.
   * authoritative=true(시작자)일 때만 시스템 메시지/모집마감을 DB 에 1회 영속화한다
   * (다른 기기는 messages 실시간 INSERT 로 동일 메시지를 받아 중복을 피한다).
   */
  const applyVoteOutcome = (
    voteId: string,
    target: string,
    passed: boolean,
    disband: boolean,
    authoritative: boolean,
  ) => {
    setVoteKick((prev) =>
      prev ? { ...prev, phase: passed ? "passed" : "rejected" } : prev,
    );
    if (!passed) return;
    applyKick(target);
    if (disband) {
      setDisbanded(true);
      setAlert({
        title: "모임 해산",
        description: `방장(${target})이 강퇴되어 모임이 해산되었어요.`,
        danger: true,
      });
    }
    if (authoritative && id) {
      const userPhone = getCurrentAccount();
      const sysText = disband
        ? DISBAND_SYSTEM_TEXT
        : `${target}님이 퇴장 투표 결과로 채팅방에서 나갔습니다`;
      const sysMsg: ChatMessage = {
        id: `${disband ? "disband" : "kick"}-${voteId}`,
        nickname: "",
        content: sysText,
        time: "",
        mine: false,
        type: "system",
      };
      // 시스템 메시지는 모두에게 보여야 하므로 messages 에 저장(실시간으로 전파).
      if (userPhone) saveMessageRow(id, userPhone, sysMsg);
      else setMessages((prev) => [...prev, sysMsg]);
      if (disband) closeRecruiting();
    }
  };

  /** 시작자(권한자) 집계 확정 → 결과 브로드캐스트 + 적용. */
  const resolveVote = (voteId: string) => {
    const t = voteTallyRef.current;
    if (!t || t.voteId !== voteId) return;
    if (t.timer) window.clearTimeout(t.timer);
    voteTallyRef.current = null;
    // 만장일치 = 반대 0표 + 찬성 1표 이상(미투표는 기권). 반대 1표라도 있으면 부결.
    const passed = t.no.size === 0 && t.yes.size >= 1;
    const disband = passed && !!hostNickname && t.target === hostNickname;
    broadcastVote({ type: "result", voteId, target: t.target, passed, disband });
    applyVoteOutcome(voteId, t.target, passed, disband, true);
  };

  /** 시작자(권한자) 표 기록 — 즉시 확정 조건 검사. */
  const recordVote = (voteId: string, voter: string, choice: "yes" | "no") => {
    const t = voteTallyRef.current;
    if (!t || t.voteId !== voteId) return;
    if (choice === "yes") t.yes.add(voter);
    else t.no.add(voter);
    if (t.no.size > 0) {
      resolveVote(voteId); // 반대 1표 → 즉시 부결
    } else if (t.yes.size >= t.eligible) {
      resolveVote(voteId); // 전원 찬성 → 즉시 가결
    }
  };

  /** 내가 시작자로서 투표 개시(대상 선택 시 호출). */
  const startVote = (target: string) => {
    if (!room) return;
    const myNick = getProfile().nickname;
    const voteId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eligible = membersRef.current.filter(
      (m) => m.nickname !== target && !m.isMe,
    ).length + 1; // 나(시작자) 포함
    voteTallyRef.current = {
      voteId,
      target,
      yes: new Set(),
      no: new Set(),
      eligible,
      timer: window.setTimeout(() => resolveVote(voteId), VOTE_DURATION_SEC * 1000),
    };
    setVoteKick({
      voteId,
      target,
      phase: "voting",
      amInitiator: true,
      myVote: "yes",
      remainSec: VOTE_DURATION_SEC,
    });
    broadcastVote({ type: "start", voteId, target, initiator: myNick, eligible });
    recordVote(voteId, myNick, "yes"); // 시작자는 자동 찬성
  };

  /** 투표 대상이 아닌 멤버가 찬성/반대 클릭. */
  const castVote = (choice: "yes" | "no") => {
    const vk = voteKick;
    if (!vk?.voteId || vk.myVote) return;
    const myNick = getProfile().nickname;
    broadcastVote({ type: "cast", voteId: vk.voteId, voter: myNick, choice });
    setVoteKick((prev) => (prev ? { ...prev, myVote: choice } : prev));
  };

  // 들어오는 투표 브로드캐스트 처리 — 최신 클로저를 ref 로 노출(채널 effect 가 호출).
  voteHandlerRef.current = (payload: VotePayload) => {
    const myNick = getProfile().nickname;
    if (payload.type === "start") {
      if (payload.initiator === myNick) return; // 내가 시작 → 로컬에서 이미 처리
      setVoteKick({
        voteId: payload.voteId,
        target: payload.target,
        phase: "voting",
        amTarget: payload.target === myNick,
        remainSec: VOTE_DURATION_SEC,
      });
    } else if (payload.type === "cast") {
      recordVote(payload.voteId, payload.voter, payload.choice); // 권한자만 실제 반영
    } else if (payload.type === "result") {
      applyVoteOutcome(
        payload.voteId,
        payload.target,
        payload.passed,
        payload.disband,
        false,
      );
    }
  };

  // 모달 남은시간 카운트다운(표시용). voting 단계 동안만 1초씩 감소.
  useEffect(() => {
    if (voteKick?.phase !== "voting") return;
    const iv = window.setInterval(() => {
      setVoteKick((prev) => {
        if (!prev || prev.phase !== "voting") return prev;
        return { ...prev, remainSec: Math.max(0, (prev.remainSec ?? VOTE_DURATION_SEC) - 1) };
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [voteKick?.phase, voteKick?.voteId]);

  // 투표자 안전장치 — 시작자가 이탈해 result 가 안 오면 제한시간+6초 후 모달 자동 종료.
  useEffect(() => {
    if (voteKick?.phase !== "voting" || voteKick.amInitiator) return;
    const t = window.setTimeout(
      () =>
        setVoteKick((prev) =>
          prev && prev.phase === "voting" ? { ...prev, phase: "rejected" } : prev,
        ),
      (VOTE_DURATION_SEC + 6) * 1000,
    );
    return () => window.clearTimeout(t);
  }, [voteKick?.phase, voteKick?.voteId, voteKick?.amInitiator]);

  const nowTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 이미지 파일을 Storage에 업로드 후 메시지에 추가
  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const roomId = id ?? "unknown";
    const myNickname = getProfile().nickname;
    const userPhone = getCurrentAccount();

    Array.from(files).forEach((file, idx) => {
      const msgId = `${Date.now()}-${idx}`;
      const time = nowTime();

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;

        // Storage 업로드 (실패 시 base64 fallback)
        const resolvedUrl = await uploadPhotoToStorage(dataUrl, `chat/${roomId}`);

        // UI에 즉시 표시
        setMessages((prev) => [
          ...prev,
          {
            id: msgId,
            nickname: myNickname,
            content: "",
            time,
            mine: true,
            type: "image" as const,
            imageUrl: resolvedUrl,
            read: false,
            readBy: Math.max(0, displayMemberCount - 1),
          },
        ]);

        // Supabase messages 테이블에 저장 (best-effort)
        if (userPhone && id) {
          supabase.from("messages").insert({
            message_id: msgId,
            room_id: id,
            sender_phone: userPhone,
            sender_nickname: myNickname,
            content: "",
            image_url: resolvedUrl,
            sent_time: time,
            read_by: [],
          }).then(({ error }) => {
            if (error) console.warn("Supabase 이미지 메시지 저장 실패:", error.message);
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 일반 파일을 메시지로 추가 (실제 업로드는 안 하고 메타데이터만)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const userPhone = getCurrentAccount();
    const myNickname = getProfile().nickname;
    Array.from(files).forEach((file, idx) => {
      const msg: ChatMessage = {
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
        readBy: Math.max(0, displayMemberCount - 1),
      };
      setMessages((prev) => [...prev, msg]);
      // 파일 메시지 영속화 — 그동안 Supabase insert 가 없어 재입장 시 통째로 사라졌다.
      if (userPhone && id) saveMessageRow(id, userPhone, { ...msg, nickname: myNickname });
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
    const msg: ChatMessage = {
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
      readBy: Math.max(0, displayMemberCount - 1),
    };
    setMessages((prev) => [...prev, msg]);
    // 위치 메시지 영속화 — 그동안 Supabase insert 가 없어 재입장 시 통째로 사라졌다.
    const userPhone = getCurrentAccount();
    if (userPhone && id) saveMessageRow(id, userPhone, { ...msg, nickname: getProfile().nickname });
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
              {[formatYyMmDd(room.meeting.date), room.meeting.time]
                .filter(Boolean)
                .join(" · ") || "일정 미정"}
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
                memberCount={displayMemberCount}
                onLongPress={(target) => setActionTarget(target)}
                onReact={() => setReactionTarget(m.id)}
                showReactionPicker={reactionTarget === m.id}
                onPickEmoji={(e) => addReaction(m.id, e)}
                onProfileClick={(nickname) =>
                  navigate(`/profile/${encodeURIComponent(nickname)}`)
                }
                onImageTap={(target) => {
                  // 현재 방의 모든 이미지 메시지를 시간순으로 모아서 뷰어에 넘김.
                  // 시작 인덱스는 고유 message.id 로 찾는다 — 같은 사진을 두 번 보내
                  // imageUrl 이 중복돼도 indexOf 처럼 첫 항목으로 쏠리지 않게.
                  const imageMsgs = messages.filter(
                    (mm) => mm.type === "image" && !!mm.imageUrl,
                  );
                  const idx = imageMsgs.findIndex((mm) => mm.id === target.id);
                  setPhotoViewer({
                    images: imageMsgs.map((mm) => mm.imageUrl as string),
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
        {/* 해산된 모임 안내 — 입력 비활성화 */}
        {disbanded && (
          <div className="bg-holo-surface-2 px-4 py-2 text-center text-[12px] text-holo-ink-3">
            🚫 해산된 모임이에요. 더 이상 메시지를 보낼 수 없어요.
          </div>
        )}
        {/* 답장 미리보기 */}
        {reply && !disbanded && (
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
            disabled={disbanded}
            onClick={() => {
              setShowAttach((v) => !v);
              setShowEmoji(false);
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${
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
              disabled={disbanded}
              placeholder={disbanded ? "해산된 모임이에요" : "메시지를 입력하세요"}
              className="h-[34px] w-0 min-w-0 flex-1 bg-transparent px-2 text-[16px] outline-none placeholder:text-[13px] placeholder:text-holo-ink-3 disabled:opacity-50"
            />
            <button
              type="button"
              aria-label="이모지"
              disabled={disbanded}
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowAttach(false);
              }}
              className="text-[16px] disabled:opacity-40"
            >
              😊
            </button>
          </div>
          <button
            type="submit"
            aria-label="전송"
            disabled={disbanded || !text.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              text.trim() && !disbanded
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
          // 모임 채팅방이면 게시글의 정원을 calcJoined 로 계산해서 전달.
          // calcJoined 는 peopleCount 가 비어 있어도 5 로 폴백해서, 다른 화면(홈/맵/게시글)
          // 과 동일한 정원이 채팅방에서도 그대로 보이도록 단일 출처를 유지한다.
          capacity={(() => {
            if (!room.id.startsWith("meetup-")) return undefined;
            const postId = room.id.slice("meetup-".length);
            const post = postsStore.getPosts().find((p) => p.id === postId);
            if (!post) return undefined;
            return calcJoined(post).capacity;
          })()}
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
          // 방장(게시글 작성자)만 일정 수정 가능.
          isHost={!!hostNickname && getProfile().nickname === hostNickname}
          onEditSchedule={(date, time) => {
            // 1) 게시글 일정 갱신 — postsStore.update 가 Supabase 반영 + 실시간 전파.
            //    재입장/타기기/홈카드에도 동일하게 반영된다.
            if (postIdFromRoom) {
              const post = postsStore.getPosts().find((p) => p.id === postIdFromRoom);
              if (post) {
                postsStore.update({
                  ...post,
                  eventDate: date || undefined,
                  eventTime: time || undefined,
                });
              }
            }
            // 2) 현재 방의 meeting 배너 즉시 갱신.
            if (room) {
              setRooms((prev) =>
                prev.map((r) =>
                  r.id === room.id && r.meeting
                    ? { ...r, meeting: { ...r.meeting, date, time } }
                    : r,
                ),
              );
            }
            // 3) 채팅방에 일정 변경 시스템 공지(영속 — 모두에게 전파).
            const userPhone = getCurrentAccount();
            const label =
              [date ? formatYyMmDd(date) : "", time].filter(Boolean).join(" ") || "미정";
            const sysMsg: ChatMessage = {
              id: `sched-${Date.now()}`,
              nickname: "",
              content: `📅 다음 모임 일정이 ${label} 로 정해졌어요`,
              time: "",
              mine: false,
              type: "system",
            };
            if (userPhone && id) saveMessageRow(id, userPhone, sysMsg);
            setShowMeeting(false);
          }}
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
          // 본인 제외한 멤버만 후보 (방장 포함 — 방장 강퇴 가결 시 해산)
          candidates={members.filter((m) => !m.isMe).map((m) => m.nickname)}
          amTarget={voteKick.amTarget}
          amInitiator={voteKick.amInitiator}
          myVote={voteKick.myVote}
          remainSec={voteKick.remainSec}
          hostNickname={hostNickname}
          // 대상 선택 → 실시간 만장일치 투표 시작(브로드캐스트).
          onSelectTarget={(nickname) => startVote(nickname)}
          onCast={castVote}
          onClose={() => setVoteKick(null)}
        />
      )}

      {showInvite && room && (
        <InviteFriendsModal
          roomName={displayRoomName}
          existingNicknames={members.map((m) => m.nickname)}
          // 모임 채팅방이면 남은 자리(=정원-현재인원) 만큼만 초대 가능.
          // 일반 방은 undefined → 무제한 선택.
          maxInvite={(() => {
            if (!room.id.startsWith("meetup-")) return undefined;
            const postId = room.id.slice("meetup-".length);
            const post = postsStore.getPosts().find((p) => p.id === postId);
            if (!post) return undefined;
            return Math.max(0, calcJoined(post).capacity - members.length);
          })()}
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
            <strong>{showAddFriend}</strong>님에게 친구 요청을 하시겠습니까?
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
                // Supabase 에서도 삭제 — 안 그러면 재입장 시 loadFromSupabase 가 되살린다.
                // (삭제 액션은 내 메시지에만 노출되므로 항상 내가 보낸 = DB 저장된 행)
                if (id) {
                  supabase
                    .from("messages")
                    .delete()
                    .eq("message_id", targetId)
                    .eq("room_id", id)
                    .then(({ error }) => {
                      if (error) console.warn("Supabase 메시지 삭제 실패:", error.message);
                    });
                }
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

            // 3) Supabase 영속화 — 그동안 전달 메시지는 로컬에만 남아 재입장 시 사라지고
            //    상대 기기엔 아예 도착하지 않았다. forwarded_from + 원본 타입/첨부를 함께 저장.
            const fwdPhone = getCurrentAccount();
            const fwdNick = getProfile().nickname;
            if (fwdPhone) {
              saveMessageRow(targetRoomId, fwdPhone, { ...forwarded, nickname: fwdNick });
            }

            // 4) rooms-store 에 lastMessage / lastTime / updatedAt 반영
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
          className={`${maxW} flex items-center gap-2 rounded-2xl px-3 py-2 shadow-sm ${
            mine ? "bg-holo-lilac-deep" : "bg-white"
          }`}
          {...pressProps}
          onClick={(e) => {
            e.preventDefault();
            pressProps.onClick(e);
          }}
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
                    <div className="h-10 w-10 shrink-0">
                      <GroupAvatar room={r} size="md" />
                    </div>
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
  amTarget,
  amInitiator,
  myVote,
  remainSec,
  hostNickname,
  onSelectTarget,
  onCast,
  onClose,
}: {
  phase: "selecting" | "voting" | "passed" | "rejected";
  target: string;
  candidates: string[];
  amTarget?: boolean;
  amInitiator?: boolean;
  myVote?: "yes" | "no";
  remainSec?: number;
  hostNickname?: string;
  onSelectTarget: (nickname: string) => void;
  onCast?: (choice: "yes" | "no") => void;
  onClose: () => void;
}) {
  // 대상이 방장이면 가결 시 모임이 해산된다 — 안내 문구 분기.
  const targetIsHost = !!hostNickname && target === hostNickname;
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
              <br />
              방장을 선택해 가결되면 모임이 해산됩니다.
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
          <div className="flex flex-col items-center gap-3 py-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-holo-lilac-card-2">
              <span className="text-[26px]">🗳️</span>
            </div>
            <p className="text-center text-[15px] font-semibold text-holo-ink">
              <strong>{target}</strong>님 {targetIsHost ? "강퇴(해산) " : ""}퇴장 투표
            </p>
            {/* 남은 시간 */}
            <p className="text-[12px] text-holo-ink-3">
              남은 시간 <strong className="text-holo-purple-mid">{remainSec ?? VOTE_DURATION_SEC}초</strong>
            </p>

            {amTarget ? (
              // 내가 대상 — 투표 불가, 결과만 대기
              <p className="text-center text-[12px] text-holo-ink-3">
                나에 대한 퇴장 투표가 진행 중이에요.
                <br />
                결과를 기다리는 중…
              </p>
            ) : myVote || amInitiator ? (
              // 이미 투표함(또는 시작자=자동 찬성) — 집계 대기
              <p className="text-center text-[12px] text-holo-ink-3">
                {myVote === "no" ? "반대" : "찬성"}했어요. 다른 멤버의 투표를 집계하는 중…
              </p>
            ) : (
              // 아직 미투표 — 찬성/반대 선택
              <>
                <p className="text-center text-[12px] text-holo-ink-3">
                  {targetIsHost
                    ? "찬성하면 방장이 강퇴되고 모임이 해산돼요."
                    : "만장일치 찬성 시 퇴장돼요. 한 명이라도 반대하면 부결."}
                </p>
                <div className="mt-1 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => onCast?.("no")}
                    className="h-11 flex-1 rounded-holo-pill border border-holo-line text-[14px] font-semibold text-holo-ink"
                  >
                    반대
                  </button>
                  <button
                    type="button"
                    onClick={() => onCast?.("yes")}
                    className="h-11 flex-1 rounded-holo-pill bg-holo-error text-[14px] font-semibold text-white"
                  >
                    찬성
                  </button>
                </div>
              </>
            )}

            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-holo-line-3">
              <div className="h-full animate-pulse rounded-full bg-holo-purple-mid" />
            </div>
          </div>
        )}

        {/* 3) 만장일치 통과 */}
        {phase === "passed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-[40px]">{targetIsHost ? "📴" : "✅"}</span>
            <p className="text-[15px] font-semibold text-holo-ink">
              {targetIsHost ? "모임 해산" : "만장일치 찬성!"}
            </p>
            <p className="text-[13px] text-holo-ink-3">
              {targetIsHost ? (
                <>
                  방장 <strong>{target}</strong>님이 강퇴되어
                  <br />
                  모임이 해산되었어요. 채팅이 종료됩니다.
                </>
              ) : (
                <>
                  <strong>{target}</strong>님이 채팅방에서 퇴장되었어요.
                  <br />
                  모집 인원도 1명 줄어듭니다.
                </>
              )}
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
  isHost,
  onClose,
  onGoToPost,
  onVoteKick,
  onProfileClick,
  onShowOnMap,
  onEditSchedule,
}: {
  roomName: string;
  meeting: MeetingInfo;
  members: Member[];
  postId?: string;
  /** 방장(게시글 작성자)이면 true — 일정(날짜/시간) 수정 가능. */
  isHost?: boolean;
  onClose: () => void;
  onGoToPost?: (postId: string) => void;
  onVoteKick?: () => void;
  onProfileClick?: (nickname: string) => void;
  /** 장소 옆 핀 아이콘 클릭 시 호출 — 지도 화면에서 모임 위치를 표시. */
  onShowOnMap?: (postId: string) => void;
  /** 방장이 일정을 저장할 때 호출 — date(yyyy-mm-dd), time(HH:MM). */
  onEditSchedule?: (date: string, time: string) => void;
}) {
  // 일정 수정 인라인 에디터 상태 — 방장만 진입 가능. 장기성 모임처럼 시간이 비어 있어도
  // 방장이 그때그때 다음 모임 날짜/시간을 정할 수 있게 한다.
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(meeting.date ?? "");
  const [draftTime, setDraftTime] = useState(meeting.time ?? "");
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
          {editing ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">날짜</span>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="flex-1 rounded-md border border-holo-line bg-white px-2 py-1 text-[13px] text-holo-ink outline-none focus:border-holo-purple-mid"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">시간</span>
                <input
                  type="time"
                  value={draftTime}
                  onChange={(e) => setDraftTime(e.target.value)}
                  className="flex-1 rounded-md border border-holo-line bg-white px-2 py-1 text-[13px] text-holo-ink outline-none focus:border-holo-purple-mid"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">날짜</span>
                <span className="text-[13px] font-semibold text-holo-ink">
                  {meeting.date ? formatYyMmDd(meeting.date) : "미정"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[12px] text-holo-ink-3">시간</span>
                <span className="text-[13px] font-semibold text-holo-ink">
                  {meeting.time || "미정"}
                </span>
              </div>
            </>
          )}
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

          {/* 방장 일정 수정 — 장기성 모임처럼 매번 시간이 바뀌는 경우 방장이 직접 갱신. */}
          {isHost && onEditSchedule && (
            <div className="mt-1 border-t border-holo-line/60 pt-2">
              {editing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setDraftDate(meeting.date ?? "");
                      setDraftTime(meeting.time ?? "");
                    }}
                    className="h-8 flex-1 rounded-holo-pill border border-holo-line text-[12px] font-semibold text-holo-ink-2"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditSchedule(draftDate.trim(), draftTime.trim());
                      setEditing(false);
                    }}
                    className="h-8 flex-1 rounded-holo-pill bg-holo-purple-mid text-[12px] font-semibold text-white"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex h-8 w-full items-center justify-center gap-1 rounded-holo-pill border border-holo-purple-mid text-[12px] font-semibold text-holo-purple-mid"
                >
                  📅 일정 수정
                </button>
              )}
            </div>
          )}
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
  capacity,
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
  /** 모임 정원. 모임 채팅방일 때만 전달되며, 일반 1:1/그룹 채팅은 undefined. */
  capacity?: number | null;
  onClose: () => void;
  onAddFriend: (nickname: string) => void;
  onInvite: () => void;
  onBlock: () => void;
  onReport: () => void;
  onLeave: () => void;
  onProfileClick?: (nickname: string) => void;
}) {
  // 정원이 지정된 모임 채팅방인 경우, 현재 인원이 정원에 도달했는지로 초대 버튼 분기.
  const hasCapacity = typeof capacity === "number" && capacity > 0;
  const isFull = hasCapacity && members.length >= (capacity as number);
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
          <span className="text-[14px] text-holo-ink-2">
            {hasCapacity ? `${members.length}/${capacity}명` : `${members.length}명`}
          </span>
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
          disabled={isFull}
          className={`mt-4 h-[44px] w-full rounded-full text-[14px] font-semibold text-white transition ${
            isFull ? "bg-holo-ink-4" : "bg-holo-gradient active:opacity-90"
          }`}
        >
          {isFull ? "모임 인원이 꽉 찼어요" : "초대하기"}
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
  maxInvite,
  onClose,
  onInvite,
}: {
  roomName: string;
  existingNicknames: string[];
  /**
   * 한 번에 초대 가능한 최대 인원. 모임 채팅방의 남은 자리(정원-현재인원).
   * undefined 면 제한 없음 (일반 그룹/1:1 채팅).
   * 0 이면 정원 꽉 차서 추가 초대 불가.
   */
  maxInvite?: number;
  onClose: () => void;
  onInvite: (nicknames: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const allFriends = useFriends();
  // 선택 한도 도달 여부 — 모임 채팅방에서 남은 자리만큼만 선택할 수 있도록 강제.
  const limitReached =
    typeof maxInvite === "number" && selected.size >= maxInvite;

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        // 한도 도달 시 추가 선택 차단
        if (typeof maxInvite === "number" && next.size >= maxInvite) return prev;
        next.add(id);
      }
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
          {/* 모임 채팅방의 남은 자리 안내 — 한도 도달 시 보라색으로 강조. */}
          {typeof maxInvite === "number" && (
            <p
              className={`mt-1 text-[11px] font-medium ${
                limitReached ? "text-holo-purple-mid" : "text-holo-ink-3"
              }`}
            >
              {maxInvite === 0
                ? "모임 정원이 꽉 차 더 이상 초대할 수 없어요"
                : limitReached
                  ? `최대 ${maxInvite}명까지 선택했어요`
                  : `남은 자리 ${maxInvite}명 · 최대 ${maxInvite}명까지 초대할 수 있어요`}
            </p>
          )}
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
              // (1) 이미 채팅방에 있는 친구 = disabled
              // (2) 정원 한도에 도달했고 현재 미선택 친구 = disabled (선택 차단)
              const disabled =
                f.already || (limitReached && !isSelected);
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
