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
  /**
   * 친구 추가용 고유 ID — 5자 영숫자 (예: "ajhd5").
   * 계정마다 다르고 친구추가 QR/ID 화면에서 노출된다.
   * 빈 값으로 로드되면 loadInitial 에서 자동 생성·저장한다.
   */
  friendCode: string;
};

/**
 * 영숫자(소문자) 5자 랜덤 코드 생성 — 친구 코드 자동 발급용.
 * 시각적으로 혼동되는 0/o, 1/l/i 는 제외해 사용자가 입력해도 헷갈리지 않게 한다.
 */
function generateFriendCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return out;
}

const DEFAULT_STATE: ProfileState = {
  nickname: ME.nickname,
  title: ME.title,
  // 신규 가입 시 자동으로 장착되는 기본 뱃지 — "홀로 입주자"
  equippedBadgeId: "badge_24",
  profileFace: null,
  friendCode: ME.friendCode, // 기본 ME 데이터의 코드를 폴백으로 사용 (이후 가입/로그인 시 덮어씀)
};

function loadInitial(): ProfileState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const merged: ProfileState = { ...DEFAULT_STATE, ...parsed };
        // 이전 버전 사용자(friendCode 미보유) 호환 — 빈 값이면 즉석 생성.
        if (!merged.friendCode) merged.friendCode = generateFriendCode();
        return merged;
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

/**
 * 친구 코드 설정 — 테스트 계정 로그인 / 신규 가입 시 호출.
 * 빈 문자열을 넘기면 새 코드를 즉석 생성한다.
 */
export function setFriendCode(code: string) {
  const next = code && code.trim().length > 0 ? code.trim() : generateFriendCode();
  _state = { ..._state, friendCode: next };
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
