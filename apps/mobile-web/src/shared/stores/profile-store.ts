/**
 * 프로필 상태 공유 store
 * mypage-screen ↔ profile-edit-screen ↔ my-badges-screen ↔ my-titles-screen
 *
 * localStorage 에 영속화되어 회원가입 시 설정한 닉네임/얼굴/제목/뱃지가
 * 홈·마이페이지 모든 화면에 그대로 노출되도록 한다.
 */
import { ME } from "@/shared/mock/data";
import { BADGES as BADGE_LIB } from "@/badge";

const STORAGE_KEY = "holo:profile:v1";

type ProfileState = {
  nickname: string;
  title: string;
  equippedBadgeId: string;
  /** 회원가입 시 선택한 프로필 얼굴 이미지 URL. null 이면 ME_PERSONA 기본값 사용. */
  profileFace: string | null;
};

const DEFAULT_STATE: ProfileState = {
  nickname: ME.nickname,
  title: ME.title,
  // 신규 가입 시 자동으로 장착되는 기본 뱃지 — "홀로 입주자"
  equippedBadgeId: "badge_24",
  profileFace: null,
};

function loadInitial(): ProfileState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_STATE, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

let _state: ProfileState = loadInitial();

const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function getProfile() {
  return _state;
}

export function setNickname(nickname: string) {
  _state = { ..._state, nickname };
  persist();
  notify();
}

export function setTitle(title: string) {
  _state = { ..._state, title };
  persist();
  notify();
}

export function setEquippedBadgeId(id: string) {
  _state = { ..._state, equippedBadgeId: id };
  persist();
  notify();
}

export function setProfileFace(face: string | null) {
  _state = { ..._state, profileFace: face };
  persist();
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
