// 동적으로 누적되는 알림(친구 요청 등)을 저장하는 store.
// 정적 알림(댓글/좋아요/채팅 등 mock)은 notification-panel.tsx 에 그대로 두고,
// 이 store 는 사용자 행동(친구 요청 전송/수락)이 만들어내는 실시간 알림만 관리한다.

import { useEffect, useState } from "react";
import { getNotificationSettings } from "@/shared/stores/notification-settings-store";
import { isInQuietHoursNow } from "@/features/mypage/quiet-hours-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/**
 * 알림 발행 게이트.
 * - 전체 알림(master) OFF: 무조건 차단
 * - 방해금지(quietEnabled) ON 인데 현재 시각이 그 시간대 안: 차단
 * - 종류별 토글(comment/like/friend/chat/meeting/event) OFF: 차단
 * - 그 외: 허용
 *
 * gateKey 는 NotificationSettings 의 종류별 key. friend-* 는 "friend", post/meeting/event 도 적절히 매핑.
 */
function isAllowed(
  gateKey: "comment" | "like" | "friend" | "chat" | "meeting" | "event",
): boolean {
  const s = getNotificationSettings();
  if (!s.master) return false;
  if (s.quietEnabled && isInQuietHoursNow()) return false;
  if (!s[gateKey]) return false;
  return true;
}

/**
 * 사용자 행동 '확인' 알림(가입 환영 / 보상 도착 / 글 등록 완료)용 게이트.
 * 마케팅성 'event' 토글(기본값 OFF)에 묶으면 기본 상태에서 영영 안 뜨므로,
 * 마스터 스위치 + 방해금지만 따른다(카테고리 토글 무관).
 */
function isAllowedConfirmation(): boolean {
  const s = getNotificationSettings();
  if (!s.master) return false;
  if (s.quietEnabled && isInQuietHoursNow()) return false;
  return true;
}

export type DynNotifKind =
  | "friend-received"
  | "friend-accepted"
  | "welcome"
  | "reward"
  | "post-created"
  | "meeting-joined"
  | "meeting-full"
  | "comment"
  | "like"
  | "chat";

export type DynNotification = {
  id: string;
  /** 어떤 사건으로 만들어진 알림인지 */
  kind: DynNotifKind;
  /** 패널에서 표시할 분류 라벨 */
  title: string;
  /** 본문 — "X님이 친구 요청을 보냈어요" 등 */
  body: string;
  /** "방금 전", "5분 전" 같은 표시용 라벨 — createdAt 기준으로 매번 재계산해도 되지만 단순화하여 한 번만 기록 */
  time: string;
  /** 정렬 / 시간 라벨 재계산용 timestamp */
  createdAt: number;
  /** 읽음 여부 */
  read: boolean;
  /** 클릭 시 이동할 경로 */
  link: string;
};

// v2: 테스트 계정 잔여 알림 초기화를 위해 키 버전 업.
// 기존 v1 데이터는 더 이상 읽지 않으며 새 앱 로드 시 깨끗하게 시작된다.
const STORAGE_KEY = "holo.notifications.dynamic.v2";

/** 알림 목록 최대 보관 개수 — 이보다 많아지면 오래된 것부터 버린다(무한정 쌓임 방지). */
const MAX_NOTIF = 50;

function load(): DynNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DynNotification[];
  } catch {
    // ignore
  }
  return [];
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_list));
  } catch {
    // ignore quota
  }
}

let _list: DynNotification[] = load();
const listeners = new Set<() => void>();

function notify() {
  persist();
  listeners.forEach((l) => l());
}

/** 알림을 _list에 추가하고 Supabase에도 저장 (best-effort) */
function _addNotif(item: DynNotification): void {
  // 카톡식 합치기: 같은 종류(kind) + 같은 대상(link)의 기존 알림이 있으면,
  // 새로 쌓지 않고 그 자리를 최신 내용으로 교체한 뒤 맨 위로 올린다.
  // (예: 같은 글에 좋아요/댓글이 여러 번 → 알림 1개가 갱신되며 위로)
  const rest = _list.filter((n) => !(n.kind === item.kind && n.link === item.link));
  _list = [item, ...rest];
  // 너무 길게 쌓이지 않도록 최신 MAX_NOTIF개만 유지.
  if (_list.length > MAX_NOTIF) _list = _list.slice(0, MAX_NOTIF);
  notify();
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("notifications").insert({
      user_id: userPhone,
      type: item.kind,
      content: item.body,
      is_read: item.read,
    }).then(({ error }) => {
      if (error) console.warn("Supabase 알림 저장 실패:", error.message);
    });
  }
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return "방금 전";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

export function getDynNotifications(): DynNotification[] {
  // 표시할 때마다 time 라벨을 새로 계산해 신선하게 보이도록 한다.
  return _list.map((n) => ({ ...n, time: timeAgo(n.createdAt) }));
}

/** 읽음 표시 */
export function markDynRead(id: string): void {
  let changed = false;
  _list = _list.map((n) => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) notify();
}

/** 신규 가입 시 동적 알림 모두 삭제 */
export function clearAllDynNotifications(): void {
  if (_list.length === 0) return;
  _list = [];
  notify();
}

/** 모두 읽음 처리 */
export function markAllDynRead(): void {
  let changed = false;
  _list = _list.map((n) => {
    if (!n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) notify();
}

/** 알림이 게이트에 차단됐을 때 push* 가 돌려주는 sentinel — 호출 측이 굳이 검사하지 않아도
 *  read=true, body="" 처럼 보이지 않게 만들어 자연스럽게 버려진다. */
const SUPPRESSED: DynNotification = {
  id: "suppressed",
  kind: "welcome",
  title: "",
  body: "",
  time: "",
  createdAt: 0,
  read: true,
  link: "",
};

/** 받은 친구 요청 알림 발행 */
export function pushFriendRequestReceived(
  nickname: string,
  opts?: { createdAt?: number; id?: string },
): DynNotification {
  if (!isAllowed("friend")) return SUPPRESSED;
  const createdAt = opts?.createdAt ?? Date.now();
  const item: DynNotification = {
    id: opts?.id ?? `dn-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "friend-received",
    title: "친구 요청",
    body: `${nickname}님이 친구 요청을 보냈어요.`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: "/mypage/friends/requests",
  };
  _addNotif(item);
  return item;
}

/** 가입 환영 알림 — event 범주로 게이트 */
export function pushWelcomeNotification(nickname: string): DynNotification {
  if (!isAllowedConfirmation()) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-welcome-${createdAt}`,
    kind: "welcome",
    title: "환영해요!",
    body: `${nickname}님, HOLO 가입을 축하해요. 오늘부터 동네 이웃이에요 🎉`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: "/mypage",
  };
  _addNotif(item);
  return item;
}

/** 가입 보상 포인트 도착 알림 — 무료 포인트 페이지로 유도 */
export function pushRewardNotification(
  title: string,
  body: string,
  link: string,
): DynNotification {
  if (!isAllowedConfirmation()) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-reward-${createdAt}`,
    kind: "reward",
    title,
    body,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link,
  };
  _addNotif(item);
  return item;
}

/** 새 글 등록 직후 발행 — 작성한 글로 바로 이동할 수 있는 알림 */
export function pushPostCreated(
  title: string,
  postId: string,
): DynNotification {
  // 글 등록 확인 알림은 event 범주로 게이트 (정보성/확인 메시지)
  if (!isAllowedConfirmation()) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-post-${createdAt}`,
    kind: "post-created",
    title: "글 등록 완료",
    body: `"${title}" 글이 등록됐어요. 동네 이웃의 반응을 기다려보세요!`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/board/${postId}`,
  };
  _addNotif(item);
  return item;
}

/** 모임 참여(함께하기) 직후 발행 — 참여한 모임 상세로 이동 */
export function pushMeetingJoined(
  title: string,
  postId: string,
): DynNotification {
  if (!isAllowed("meeting")) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-meeting-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "meeting-joined",
    title: "모임 참여 완료",
    body: `"${title}" 모임에 참여했어요. 모임 일정을 잊지 마세요!`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/board/${postId}`,
  };
  _addNotif(item);
  return item;
}

/**
 * 내가 주최한 모임의 인원이 정원에 도달했을 때 발행.
 *  - postId 와 함께 멱등성 보장 ("이미 발행됨" 체크) — 같은 모임에 두 번 알림 가지 않게.
 *  - "meeting" 카테고리에 매핑되어 사용자 설정에서 모임 알림을 끄면 노출되지 않는다.
 */
export function pushMeetingFull(
  title: string,
  postId: string,
): DynNotification {
  if (!isAllowed("meeting")) return SUPPRESSED;
  // 이미 같은 postId 로 "meeting-full" 알림이 있으면 중복 발행하지 않음.
  const already = _list.some(
    (n) => n.kind === "meeting-full" && n.link === `/board/${postId}`,
  );
  if (already) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-meeting-full-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "meeting-full",
    title: "모임 모집 완료",
    body: `"${title}" 모임 인원이 모두 채워졌어요!`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/board/${postId}`,
  };
  _addNotif(item);
  return item;
}

/** 내 글에 누군가 댓글을 달았을 때 발행 (mock 시뮬레이션 / 실제 다른 사용자 행동에서 호출) */
export function pushCommentReceived(
  commenterNickname: string,
  postTitle: string,
  postId: string,
): DynNotification {
  if (!isAllowed("comment")) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-comment-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "comment",
    title: "댓글 알림",
    body: `${commenterNickname}님이 내 글 "${postTitle}"에 댓글을 달았어요.`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/board/${postId}`,
  };
  _addNotif(item);
  return item;
}

/** 내 글에 누군가 좋아요를 눌렀을 때 발행 (mock 시뮬레이션 / 실제 다른 사용자 행동에서 호출) */
export function pushLikeReceived(
  likerNickname: string,
  postTitle: string,
  postId: string,
): DynNotification {
  if (!isAllowed("like")) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-like-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "like",
    title: "좋아요 알림",
    body: `${likerNickname}님이 내 글 "${postTitle}"에 좋아요를 눌렀어요.`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/board/${postId}`,
  };
  _addNotif(item);
  return item;
}

/** 내가 보낸 요청을 상대가 수락했을 때 알림 발행 */
export function pushFriendRequestAccepted(nickname: string): DynNotification {
  if (!isAllowed("friend")) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "friend-accepted",
    title: "친구 요청 수락",
    body: `${nickname}님이 친구 요청을 수락했어요. 이제 친구예요!`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: "/mypage/friends",
  };
  _addNotif(item);
  return item;
}

/**
 * 내가 받은 요청을 직접 수락했을 때 알림 발행 — pushFriendRequestAccepted 와 동일한 kind 를
 * 쓰지만, "내가 수락했다" 는 관점으로 본문이 다르다. 수락 직후 알림 패널에 한 줄이 남아서
 * 사용자가 "이게 친구가 된 거구나" 라고 명확히 인지하게 한다.
 */
export function pushBecameFriendByMe(nickname: string): DynNotification {
  if (!isAllowed("friend")) return SUPPRESSED;
  const createdAt = Date.now();
  const item: DynNotification = {
    id: `dn-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "friend-accepted",
    title: "친구가 됐어요",
    body: `${nickname}님의 친구 요청을 수락했어요. 이제 친구예요!`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: "/mypage/friends",
  };
  _addNotif(item);
  return item;
}

/** 특정 닉네임에 대한 받은-친구요청 알림 제거 (수락/거절 시 정리) */
export function removeReceivedNotificationByNickname(nickname: string): void {
  const before = _list.length;
  _list = _list.filter(
    (n) =>
      !(
        n.kind === "friend-received" &&
        n.body.startsWith(`${nickname}님`)
      ),
  );
  if (_list.length !== before) notify();
}

/** 외부 구독 (React 외 사용처용) */
export function subscribeDynNotifications(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React 컴포넌트용 */
export function useDynNotifications(): DynNotification[] {
  const [list, setList] = useState<DynNotification[]>(getDynNotifications);
  useEffect(() => {
    const listener = () => setList(getDynNotifications());
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return list;
}

/** 채팅 메시지 수신 알림 발행 — 내가 속한 방에 새 메시지가 왔을 때 */
export function pushChatMessage(
  senderNickname: string,
  roomName: string,
  roomId: string,
  content: string,
): DynNotification {
  if (!isAllowed("chat")) return SUPPRESSED;
  const createdAt = Date.now();
  const preview = content.length > 30 ? content.slice(0, 30) + "…" : content;
  const item: DynNotification = {
    id: `dn-chat-${roomId}-${createdAt}`,
    kind: "chat",
    title: roomName,
    body: `${senderNickname}: ${preview}`,
    time: timeAgo(createdAt),
    createdAt,
    read: false,
    link: `/chat/${roomId}`,
  };
  _addNotif(item);

  return item;
}
