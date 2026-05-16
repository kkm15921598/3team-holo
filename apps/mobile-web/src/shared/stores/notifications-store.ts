// 동적으로 누적되는 알림(친구 요청 등)을 저장하는 store.
// 정적 알림(댓글/좋아요/채팅 등 mock)은 notification-panel.tsx 에 그대로 두고,
// 이 store 는 사용자 행동(친구 요청 전송/수락)이 만들어내는 실시간 알림만 관리한다.

import { useEffect, useState } from "react";

export type DynNotifKind =
  | "friend-received"
  | "friend-accepted"
  | "welcome"
  | "reward";

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

const STORAGE_KEY = "holo.notifications.dynamic.v1";

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

/** 받은 친구 요청 알림 발행 */
export function pushFriendRequestReceived(
  nickname: string,
  opts?: { createdAt?: number; id?: string },
): DynNotification {
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
  _list = [item, ..._list];
  notify();
  return item;
}

/** 가입 환영 알림 */
export function pushWelcomeNotification(nickname: string): DynNotification {
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
  _list = [item, ..._list];
  notify();
  return item;
}

/** 가입 보상 포인트 도착 알림 — 무료 포인트 페이지로 유도 */
export function pushRewardNotification(
  title: string,
  body: string,
  link: string,
): DynNotification {
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
  _list = [item, ..._list];
  notify();
  return item;
}

/** 내가 보낸 요청을 상대가 수락했을 때 알림 발행 */
export function pushFriendRequestAccepted(nickname: string): DynNotification {
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
  _list = [item, ..._list];
  notify();
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
