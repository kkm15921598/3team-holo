/**
 * 프로필 상태 공유 store
 * mypage-screen ↔ profile-edit-screen ↔ my-badges-screen ↔ my-titles-screen
 */
import { ME } from "@/shared/mock/data";
import { BADGES as BADGE_LIB } from "@/badge";

// 초기값은 mock ME 데이터 기준
let _state = {
  nickname: ME.nickname,
  title: ME.title,
  equippedBadgeId: "badge_01", // 기본 장착 뱃지
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getProfile() {
  return _state;
}

export function setNickname(nickname: string) {
  _state = { ..._state, nickname };
  notify();
}

export function setTitle(title: string) {
  _state = { ..._state, title };
  notify();
}

export function setEquippedBadgeId(id: string) {
  _state = { ..._state, equippedBadgeId: id };
  notify();
}

export function subscribeProfile(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 현재 장착 뱃지 이미지 src */
export function getEquippedBadgeSrc(): string | null {
  return BADGE_LIB.find((b) => b.id === _state.equippedBadgeId)?.src ?? null;
}
