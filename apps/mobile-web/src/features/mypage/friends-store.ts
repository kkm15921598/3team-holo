// 친구 목록을 화면 간에 공유하기 위한 모듈 레벨 store.
// localStorage에 영속화하여 HMR/새로고침에도 보존된다.

import { useEffect, useState } from "react";
import {
  getDynNotifications,
  pushBecameFriendByMe,
  pushFriendRequestReceived,
  removeReceivedNotificationByNickname,
} from "@/shared/stores/notifications-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { getProfile } from "@/shared/stores/profile-store";

export type Friend = { id: string; nickname: string; avatarBg: string };

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

// v2: 테스트 계정 잔여 데이터 자동 초기화 — 모든 기기에서 앱 재오픈 시 깨끗하게 시작.
// 친구·차단·요청 목록은 Supabase에서 다시 불러온다.
const STORAGE_KEY = "holo.friends.v2";
const BLOCKED_STORAGE_KEY = "holo.friends.blocked.v2";
const REQUESTS_STORAGE_KEY = "holo.friends.requests.v2";

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

let _friends: Friend[] = loadFromStorage<Friend[]>(STORAGE_KEY, []);
let _blocked: Friend[] = loadFromStorage<Friend[]>(BLOCKED_STORAGE_KEY, []);
let _requests: FriendRequest[] = loadFromStorage<FriendRequest[]>(REQUESTS_STORAGE_KEY, []);

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

  // Supabase에 저장 (best-effort) — friend_id는 FK 충돌로 제외
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friends").insert({
      user_phone: userPhone,
      friend_nickname: newFriend.nickname,
      avatar_bg: newFriend.avatarBg,
    }).then(({ error }) => {
      if (error) console.warn("Supabase 친구 저장 실패:", error.message);
    });
  }

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

  // Supabase에 요청 저장 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friend_requests").insert({
      user_phone: userPhone,
      request_id: req.id,
      nickname: req.nickname,
      direction: req.direction,
      avatar_bg: req.avatarBg,
      time_ago: req.timeAgo,
    }).then(({ error }) => {
      if (error) console.warn("Supabase 친구 요청 저장 실패:", error.message);
    });
  }

  return "sent";
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
  // Supabase friend_requests에서 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friend_requests")
      .delete()
      .eq("request_id", requestId)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 요청 수락 삭제 실패:", error.message);
      });
  }
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
  // Supabase에서도 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friend_requests")
      .delete()
      .eq("request_id", requestId)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 요청 거절 삭제 실패:", error.message);
      });
  }
}

/** 보낸 요청 취소 → 요청 제거 */
export function cancelFriendRequest(requestId: string): void {
  _requests = _requests.filter(
    (r) => !(r.id === requestId && r.direction === "sent"),
  );
  notify();
  // Supabase에서도 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friend_requests")
      .delete()
      .eq("user_phone", userPhone)
      .eq("request_id", requestId)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 요청 취소 삭제 실패:", error.message);
      });
  }
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
  // Supabase에서도 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friends")
      .delete()
      .eq("user_phone", userPhone)
      .eq("friend_nickname", nickname)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 삭제 실패:", error.message);
      });
  }
}

export function removeFriendById(id: string) {
  const target = _friends.find((f) => f.id === id);
  _friends = _friends.filter((f) => f.id !== id);
  notify();
  // Supabase에서도 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone && target) {
    supabase.from("friends")
      .delete()
      .eq("user_phone", userPhone)
      .eq("friend_id", id)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 삭제 실패:", error.message);
      });
  }
}

export function blockFriendById(id: string) {
  const target = _friends.find((f) => f.id === id);
  if (!target) return;
  _friends = _friends.filter((f) => f.id !== id);
  _blocked = [..._blocked, target];
  notify();
  // Supabase friends에서 삭제 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("friends")
      .delete()
      .eq("user_phone", userPhone)
      .eq("friend_id", id)
      .then(({ error }) => {
        if (error) console.warn("Supabase 친구 차단 삭제 실패:", error.message);
      });
  }
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

/**
 * Supabase friends 테이블에서 친구 목록을 읽어와 로컬 상태와 병합.
 */
export async function syncFriendsFromSupabase(): Promise<void> {
  // 신규 가입 직후 2분간은 Supabase 구(舊) 데이터가 방금 저장한 데이터를 덮어쓰지 않도록 skip.
  const _freshTs = typeof window !== "undefined" ? window.localStorage.getItem("holo:fresh-signup") : null;
  if (_freshTs && Date.now() - parseInt(_freshTs) < 120_000) return;

  const userPhone = getCurrentAccount();
  if (!userPhone) return;

  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .eq("user_phone", userPhone);

  if (error) {
    console.warn("Supabase 친구 목록 읽기 실패:", error.message);
    return;
  }
  if (!data || data.length === 0) return;

  const fromSupabase: Friend[] = data.map((row: Record<string, unknown>) => ({
    id: (row.friend_id as string | undefined) ?? (row.id as string | undefined) ?? `fr-sb-${row.friend_nickname as string}`,
    nickname: row.friend_nickname as string,
    avatarBg: (row.avatar_bg as string | undefined) ?? pickAvatarBg(row.friend_nickname as string),
  }));

  const existingNicknames = new Set(_friends.map((f) => f.nickname));
  const toAdd = fromSupabase.filter((f) => !existingNicknames.has(f.nickname));

  if (_friends.length === 0 && toAdd.length > 0) {
    _friends = fromSupabase;
  } else {
    _friends = [..._friends, ...toAdd];
  }

  saveToStorage(STORAGE_KEY, _friends);
  listeners.forEach((l) => l());
}

/**
 * Supabase friend_requests 테이블에서 보낸/받은 요청을 불러와 로컬 상태와 병합.
 *
 * - 보낸 요청: WHERE user_phone = 내 번호 AND direction = 'sent'
 * - 받은 요청: WHERE direction = 'sent' AND nickname = 내 닉네임
 *   (상대방이 저장한 direction='sent' 행에서 nickname이 나인 것을 조회)
 */
export async function syncFriendRequestsFromSupabase(): Promise<void> {
  // 신규 가입 직후 2분간은 Supabase 구(舊) 데이터가 방금 저장한 데이터를 덮어쓰지 않도록 skip.
  const _freshTs = typeof window !== "undefined" ? window.localStorage.getItem("holo:fresh-signup") : null;
  if (_freshTs && Date.now() - parseInt(_freshTs) < 120_000) return;

  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const myNickname = getProfile().nickname;
  if (!myNickname || myNickname === "새로운 입주자") return;

  // 보낸 요청
  const { data: sentData, error: sentError } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("user_phone", userPhone)
    .eq("direction", "sent");

  if (sentError) {
    console.warn("Supabase 보낸 요청 읽기 실패:", sentError.message);
  }

  // 받은 요청 (상대방이 direction='sent'로 저장하고 nickname=내 닉네임인 것)
  const { data: receivedData, error: receivedError } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("direction", "sent")
    .eq("nickname", myNickname);

  if (receivedError) {
    console.warn("Supabase 받은 요청 읽기 실패:", receivedError.message);
  }

  const existingIds = new Set(_requests.map((r) => r.id));

  const fromSent: FriendRequest[] = (sentData ?? [])
    .filter((row: Record<string, unknown>) => !existingIds.has(row.request_id as string))
    .map((row: Record<string, unknown>) => ({
      id: row.request_id as string,
      nickname: row.nickname as string,
      avatarBg: (row.avatar_bg as string | undefined) ?? pickAvatarBg(row.nickname as string),
      direction: "sent" as const,
      timeAgo: (row.time_ago as string | undefined) ?? "이전",
      createdAt: row.created_at
        ? new Date(row.created_at as string).getTime()
        : Date.now(),
    }));

  const fromReceived: FriendRequest[] = (receivedData ?? [])
    .filter((row: Record<string, unknown>) => {
      // 이미 로컬에 있거나, 내가 보낸 요청(user_phone이 나인 것)은 제외
      if (row.user_phone === userPhone) return false;
      return !existingIds.has(row.request_id as string);
    })
    .map((row: Record<string, unknown>) => ({
      id: row.request_id as string,
      nickname: row.user_phone as string, // 발신자 전화번호를 임시 id로만 쓰고 닉네임은 별도 조회 불필요
      avatarBg: (row.avatar_bg as string | undefined) ?? pickAvatarBg(row.user_phone as string),
      direction: "received" as const,
      timeAgo: (row.time_ago as string | undefined) ?? "이전",
      createdAt: row.created_at
        ? new Date(row.created_at as string).getTime()
        : Date.now(),
    }));

  if (fromSent.length === 0 && fromReceived.length === 0) return;

  // 받은 요청의 nickname을 Supabase users 테이블에서 조회
  const receivedPhones = fromReceived.map((r) => r.nickname); // nickname 필드에 전화번호가 들어있음
  let phoneToNickname: Record<string, string> = {};
  if (receivedPhones.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("phone, nickname")
      .in("phone", receivedPhones);
    if (usersData) {
      for (const u of usersData as { phone: string; nickname: string }[]) {
        phoneToNickname[u.phone] = u.nickname;
      }
    }
  }

  const resolvedReceived: FriendRequest[] = fromReceived.map((r) => ({
    ...r,
    nickname: phoneToNickname[r.nickname] ?? r.nickname,
    avatarBg: pickAvatarBg(phoneToNickname[r.nickname] ?? r.nickname),
  }));

  _requests = [..._requests, ...fromSent, ...resolvedReceived];
  saveToStorage(REQUESTS_STORAGE_KEY, _requests);

  // 받은 요청에 대해 알림 store에도 등록 (이미 같은 id의 알림이 있으면 스킵)
  const existingNotiIds = new Set(getDynNotifications().map((n) => n.id));
  for (const r of resolvedReceived) {
    const notiId = `dn-sync-${r.id}`;
    if (!existingNotiIds.has(notiId)) {
      pushFriendRequestReceived(r.nickname, { createdAt: r.createdAt, id: notiId });
    }
  }

  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(async () => {
      await syncFriendsFromSupabase();
      await syncFriendRequestsFromSupabase();
    }, 600);
  });
}
