// 친구 목록을 화면 간에 공유하기 위한 모듈 레벨 store.
// localStorage에 영속화하여 HMR/새로고침에도 보존된다.

import { useEffect, useState } from "react";
import { FRIENDS } from "@/shared/mock/data";

export type Friend = (typeof FRIENDS)[number];

const STORAGE_KEY = "holo.friends.v1";
const BLOCKED_STORAGE_KEY = "holo.friends.blocked.v1";

const AVATAR_BG_POOL = [
  "#C7BDFF",
  "#FFCFCF",
  "#FCEBB5",
  "#CCBCE0",
  "#DDC0FF",
  "#CAE4B9",
];

function loadFromStorage(key: string, fallback: Friend[]): Friend[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Friend[];
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function saveToStorage(key: string, value: Friend[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

let _friends: Friend[] = loadFromStorage(
  STORAGE_KEY,
  FRIENDS.map((f) => ({ ...f })),
);
let _blocked: Friend[] = loadFromStorage(BLOCKED_STORAGE_KEY, []);
const listeners = new Set<() => void>();

function notify() {
  saveToStorage(STORAGE_KEY, _friends);
  saveToStorage(BLOCKED_STORAGE_KEY, _blocked);
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

export function addFriendByNickname(nickname: string): Friend | null {
  const trimmed = nickname.trim();
  if (!trimmed) return null;
  if (_friends.some((f) => f.nickname === trimmed)) return null;
  const newFriend: Friend = {
    id: `fr-${Date.now()}`,
    nickname: trimmed,
    avatarBg: pickAvatarBg(trimmed),
  };
  _friends = [..._friends, newFriend];
  _blocked = _blocked.filter((b) => b.nickname !== trimmed);
  notify();
  return newFriend;
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

export function unblockFriendById(id: string) {
  const target = _blocked.find((b) => b.id === id);
  if (!target) return;
  _blocked = _blocked.filter((b) => b.id !== id);
  _friends = [..._friends, target];
  notify();
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
