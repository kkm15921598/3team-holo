// 친구 목록을 화면 간에 공유하기 위한 모듈 레벨 store.
// localStorage에 영속화하여 HMR/새로고침에도 보존된다.

import { useEffect, useState } from "react";
import { FRIENDS } from "@/shared/mock/data";
import {
  getDynNotifications,
  pushBecameFriendByMe,
  pushFriendRequestAccepted,
  pushFriendRequestReceived,
  removeReceivedNotificationByNickname,
} from "@/shared/stores/notifications-store";

export type Friend = (typeof FRIENDS)[number];

/** 친구 정원 — 이 수를 초과하는 추가 시도는 모두 차단된다. */
export const MAX_FRIENDS = 30;

/**
 * 친구 요청 — 보낸 요청과 받은 요청 모두 같은 타입을 쓰고 direction 으로 구분한다.
 * 수락 시 friends 로 이동, 거절/취소 시 그냥 삭제된다.
 */
export type FriendRequest = {
  id: string;
  nickname: string;
  avatarBg: string;
  direction: "sent" | "received";
  /** "1분 전" 같은 표시용 */
  timeAgo: string;
  /** 정렬용 */
  createdAt: number;
};

const STORAGE_KEY = "holo.friends.v1";
const BLOCKED_STORAGE_KEY = "holo.friends.blocked.v1";
const REQUESTS_STORAGE_KEY = "holo.friends.requests.v1";

const AVATAR_BG_POOL = [
  "#C7BDFF",
  "#FFCFCF",
  "#FCEBB5",
  "#CCBCE0",
  "#DDC0FF",
  "#CAE4B9",
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

/** 받은 요청 데모용 시드 — 신규 사용자는 두 명에게서 친구 요청을 받은 상태로 시작 */
function seedRequests(): FriendRequest[] {
  const now = Date.now();
  return [
    {
      id: "req-seed-1",
      nickname: "포근한 두부",
      avatarBg: "#C7BDFF",
      direction: "received",
      timeAgo: "10분 전",
      createdAt: now - 10 * 60 * 1000,
    },
    {
      id: "req-seed-2",
      nickname: "노래하는 햇살",
      avatarBg: "#FCEBB5",
      direction: "received",
      timeAgo: "2시간 전",
      createdAt: now - 2 * 60 * 60 * 1000,
    },
  ];
}

let _friends: Friend[] = loadFromStorage<Friend[]>(
  STORAGE_KEY,
  FRIENDS.map((f) => ({ ...f })),
);
let _blocked: Friend[] = loadFromStorage<Friend[]>(BLOCKED_STORAGE_KEY, []);
let _requests: FriendRequest[] = loadFromStorage<FriendRequest[]>(
  REQUESTS_STORAGE_KEY,
  seedRequests(),
);

// 최초 로딩 시 — 받은 요청이 있는데 동적 알림 store 에는 아직 아무것도 없다면
// 시드 요청에 대응되는 알림을 만들어 둔다(데모 초기 진입 시 패널에 자연스럽게 표시).
if (typeof window !== "undefined") {
  const existing = getDynNotifications();
  if (existing.length === 0) {
    for (const r of _requests.filter((r) => r.direction === "received")) {
      pushFriendRequestReceived(r.nickname, {
        createdAt: r.createdAt,
        id: `dn-seed-${r.id}`,
      });
    }
  }
}

const listeners = new Set<() => void>();

function notify() {
  saveToStorage(STORAGE_KEY, _friends);
  saveToStorage(BLOCKED_STORAGE_KEY, _blocked);
  saveToStorage(REQUESTS_STORAGE_KEY, _requests);
  listeners.forEach((l) => l());
}

export function getFriends(): Friend[] {
  return _friends;
}

export function getBlocked(): Friend[] {
  return _blocked;
}

export function isFriend(nickname: string): boolean {
  return _friends.some((f) => f.nickname === nickname);
}

function pickAvatarBg(nickname: string): string {
  let h = 0;
  for (let i = 0; i < nickname.length; i++) {
    h = (h * 31 + nickname.charCodeAt(i)) >>> 0;
  }
  return AVATAR_BG_POOL[h % AVATAR_BG_POOL.length];
}

/**
 * 내부용 — 닉네임으로 친구 목록에 즉시 추가. 외부 호출은 sendFriendRequest 를 거치도록 한다.
 * 요청 수락(acceptFriendRequest) 시점에 이 함수가 호출된다.
 * 정원(MAX_FRIENDS)을 넘기면 null 을 반환해 호출 측에서 처리할 수 있게 한다.
 */
function addFriendInternal(nickname: string, avatarBg?: string): Friend | null {
  const trimmed = nickname.trim();
  if (!trimmed) return null;
  if (_friends.some((f) => f.nickname === trimmed)) return null;
  if (_friends.length >= MAX_FRIENDS) return null; // 정원 초과
  const newFriend: Friend = {
    id: `fr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nickname: trimmed,
    avatarBg: avatarBg ?? pickAvatarBg(trimmed),
  };
  _friends = [..._friends, newFriend];
  _blocked = _blocked.filter((b) => b.nickname !== trimmed);
  return newFriend;
}

// ─── 친구 요청 API ───────────────────────────────────────────
/** 친구 요청 결과 — UI 토스트 메시지 분기를 위한 enum */
export type SendRequestResult =
  | "sent" // 요청 전송 성공
  | "already-friend" // 이미 친구
  | "already-sent" // 이미 보낸 요청이 있음
  | "incoming-exists" // 상대가 먼저 보내서 받은 요청이 있음 — 수락 권유
  | "max-reached" // 내 친구 정원이 가득 참
  | "invalid"; // 닉네임 비어있음 등

/**
 * 친구 요청 보내기. 상대가 이미 친구거나 이미 보낸 요청이 있으면 다른 결과를 반환한다.
 * 데모 환경이라 상대편의 수락 시뮬레이션은 별도의 acceptFriendRequest 로 트리거된다.
 */
export function sendFriendRequest(nickname: string): SendRequestResult {
  const trimmed = nickname.trim();
  if (!trimmed) return "invalid";
  if (_friends.some((f) => f.nickname === trimmed)) return "already-friend";
  // 이미 정원이면 요청 자체를 막는다 — 수락돼서 친구가 되면 30명을 초과하기 때문.
  if (_friends.length >= MAX_FRIENDS) return "max-reached";
  if (
    _requests.some(
      (r) => r.direction === "sent" && r.nickname === trimmed,
    )
  ) {
    return "already-sent";
  }
  if (
    _requests.some(
      (r) => r.direction === "received" && r.nickname === trimmed,
    )
  ) {
    return "incoming-exists";
  }
  const req: FriendRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nickname: trimmed,
    avatarBg: pickAvatarBg(trimmed),
    direction: "sent",
    timeAgo: "방금 전",
    createdAt: Date.now(),
  };
  _requests = [..._requests, req];
  notify();

  // 데모용 — 6초 뒤 상대편이 수락한 것처럼 시뮬레이션해서 친구로 이동시키고
  // "X님이 친구 요청을 수락했어요" 알림을 발행한다.
  if (typeof window !== "undefined") {
    window.setTimeout(() => simulateRemoteAccept(req.id), 6000);
  }

  return "sent";
}

/** 데모 — 상대편이 내 요청을 수락한 것처럼 처리 */
function simulateRemoteAccept(requestId: string): void {
  const req = _requests.find((r) => r.id === requestId);
  if (!req || req.direction !== "sent") return; // 이미 취소/처리됐으면 무시
  // 정원 초과면 시뮬레이션 자체를 보류 — 보낸 요청은 그대로 두어 사용자가 직접 처리하게 함.
  if (_friends.length >= MAX_FRIENDS) return;
  const friend = addFriendInternal(req.nickname, req.avatarBg);
  if (!friend) return; // 안전망 (addFriendInternal 자체에서도 정원 검사함)
  _requests = _requests.filter((r) => r.id !== requestId);
  notify();
  pushFriendRequestAccepted(req.nickname);
}

/** 수락 결과 — UI 토스트 분기용 */
export type AcceptRequestResult =
  | { ok: true; friend: Friend }
  | { ok: false; reason: "not-found" | "max-reached" };

/** 받은 요청 수락 → 친구로 추가 + 요청 제거 + 관련 알림 정리 + 수락 완료 알림 발행 */
export function acceptFriendRequest(requestId: string): AcceptRequestResult {
  const req = _requests.find((r) => r.id === requestId);
  if (!req || req.direction !== "received") return { ok: false, reason: "not-found" };
  if (_friends.length >= MAX_FRIENDS) return { ok: false, reason: "max-reached" };
  const friend = addFriendInternal(req.nickname, req.avatarBg);
  if (!friend) return { ok: false, reason: "max-reached" };
  _requests = _requests.filter((r) => r.id !== requestId);
  notify();
  // 기존 "친구 요청을 보냈어요" 알림은 정리 — 이제 그 카드는 의미가 없음.
  removeReceivedNotificationByNickname(req.nickname);
  // 수락 직후 알림 패널에 "친구가 됐어요" 한 줄을 남겨, 종소리 배지만 들어오고 내역이 비는
  // 현상을 막는다 (이전엔 push 가 없어 패널이 비어 있었다).
  pushBecameFriendByMe(req.nickname);
  return { ok: true, friend };
}

/** 받은 요청 거절 → 요청만 제거 + 관련 알림 정리 */
export function declineFriendRequest(requestId: string): void {
  const req = _requests.find((r) => r.id === requestId);
  _requests = _requests.filter(
    (r) => !(r.id === requestId && r.direction === "received"),
  );
  notify();
  if (req) removeReceivedNotificationByNickname(req.nickname);
}

/** 보낸 요청 취소 → 요청 제거 */
export function cancelFriendRequest(requestId: string): void {
  _requests = _requests.filter(
    (r) => !(r.id === requestId && r.direction === "sent"),
  );
  notify();
}

/** 닉네임 기준으로 요청 조회 — 프로필 화면에서 버튼 상태 결정용 */
export function getRequestByNickname(nickname: string): FriendRequest | null {
  const trimmed = nickname.trim();
  return _requests.find((r) => r.nickname === trimmed) ?? null;
}

export function getSentRequests(): FriendRequest[] {
  return _requests.filter((r) => r.direction === "sent");
}

export function getReceivedRequests(): FriendRequest[] {
  return _requests.filter((r) => r.direction === "received");
}

export function useSentRequests(): FriendRequest[] {
  const [list, setList] = useState<FriendRequest[]>(getSentRequests);
  useEffect(() => {
    const listener = () => setList(getSentRequests());
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return list;
}

export function useReceivedRequests(): FriendRequest[] {
  const [list, setList] = useState<FriendRequest[]>(getReceivedRequests);
  useEffect(() => {
    const listener = () => setList(getReceivedRequests());
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return list;
}

export function removeFriendByNickname(nickname: string) {
  _friends = _friends.filter((f) => f.nickname !== nickname);
  notify();
}

export function removeFriendById(id: string) {
  _friends = _friends.filter((f) => f.id !== id);
  notify();
}

export function blockFriendById(id: string) {
  const target = _friends.find((f) => f.id === id);
  if (!target) return;
  _friends = _friends.filter((f) => f.id !== id);
  _blocked = [..._blocked, target];
  notify();
}

/** 차단 해제 → 친구 목록 복귀. 정원 초과 시 false 반환 (UI 토스트 분기용) */
export function unblockFriendById(id: string): boolean {
  const target = _blocked.find((b) => b.id === id);
  if (!target) return false;
  if (_friends.length >= MAX_FRIENDS) return false;
  _blocked = _blocked.filter((b) => b.id !== id);
  _friends = [..._friends, target];
  notify();
  return true;
}

export function useFriends(): Friend[] {
  const [list, setList] = useState<Friend[]>(_friends);
  useEffect(() => {
    const listener = () => setList(_friends);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return list;
}

/**
 * 신규 가입 시 친구 관련 상태를 모두 비움.
 * 친구 / 차단 / 보낸·받은 요청 모두 초기화한다.
 */
export function resetFriendsStore(): void {
  _friends = [];
  _blocked = [];
  _requests = [];
  notify();
}

export function useBlocked(): Friend[] {
  const [list, setList] = useState<Friend[]>(_blocked);
  useEffect(() => {
    const listener = () => setList(_blocked);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return list;
}
