/**
 * 프로필 상태 공유 store
 * mypage-screen ↔ profile-edit-screen ↔ my-badges-screen ↔ my-titles-screen
 *
 * localStorage 에 영속화되어 회원가입 시 설정한 닉네임/얼굴/제목/뱃지가
 * 홈·마이페이지 모든 화면에 그대로 노출되도록 한다.
 */
import { BADGES as BADGE_LIB } from "@/badge";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

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
  nickname: "새로운 입주자",
  title: "#홀로_입주자",
  // 신규 가입 시 자동으로 장착되는 기본 뱃지 — "홀로 입주자"
  equippedBadgeId: "badge_24",
  profileFace: null,
  friendCode: "", // 로그인/가입 시 덮어씌워짐
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
  // localStorage 가 비어있거나 파싱 실패 — friendCode 없이 DEFAULT_STATE 를 그대로 반환하면
  // 신규 가입 직후 ID 탭이 공백으로 보이므로, 여기서도 즉시 생성해 반환한다.
  return { ...DEFAULT_STATE, friendCode: generateFriendCode() };
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

/** 프로필 데이터를 Supabase users 테이블에 동기화 (best-effort) */
function syncProfileToSupabase(s: ProfileState) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({
    nickname: s.nickname,
    title: s.title,
    equipped_badge_id: s.equippedBadgeId,
    profile_face: s.profileFace,
    friend_code: s.friendCode,
  }).eq("phone", userPhone).then(({ error }) => {
    if (error) console.warn("Supabase 프로필 저장 실패:", error.message);
  });
}

export function getProfile() {
  return _state;
}

export function setNickname(nickname: string) {
  _state = { ..._state, nickname };
  persist();
  notify();
  syncProfileToSupabase(_state);
}

export function setTitle(title: string) {
  _state = { ..._state, title };
  persist();
  notify();
  syncProfileToSupabase(_state);
}

export function setEquippedBadgeId(id: string) {
  _state = { ..._state, equippedBadgeId: id };
  persist();
  notify();
  syncProfileToSupabase(_state);
}

export function setProfileFace(face: string | null) {
  _state = { ..._state, profileFace: face };
  persist();
  notify();
  syncProfileToSupabase(_state);
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
  syncProfileToSupabase(_state);
}

export function subscribeProfile(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 현재 장착 뱃지 이미지 src */
export function getEquippedBadgeSrc(): string | null {
  return BADGE_LIB.find((b) => b.id === _state.equippedBadgeId)?.src ?? null;
}

/**
 * Supabase users 테이블에서 프로필을 읽어와 로컬 상태 갱신.
 * 로그인 후 앱 시작 시 자동 호출.
 */
export async function syncProfileFromSupabase(): Promise<void> {
  // 신규 가입 직후 2분간은 Supabase 구(舊) 데이터가 방금 저장한 프로필을 덮어쓰지 않도록 skip.
  const freshSignupTs = typeof window !== "undefined" ? window.localStorage.getItem("holo:fresh-signup") : null;
  if (freshSignupTs && Date.now() - parseInt(freshSignupTs) < 120_000) return;

  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("nickname, title, equipped_badge_id, profile_face, friend_code")
    .eq("phone", userPhone)
    .single();
  if (error || !data) return;
  _state = {
    ..._state,
    nickname: (data.nickname as string) ?? _state.nickname,
    // Supabase title 이 빈 문자열(과거 버그로 덮어써진 경우)이면 로컬 기본값을 유지한다.
    // (?? 는 ""를 통과시켜 칭호가 빈 채로 남던 문제 — 빈 값은 '없음' 으로 취급)
    title:
      typeof data.title === "string" && data.title.trim()
        ? (data.title as string)
        : _state.title,
    equippedBadgeId: (data.equipped_badge_id as string) ?? _state.equippedBadgeId,
    profileFace: (data.profile_face as string | null) ?? _state.profileFace,
    // 서버 friend_code 가 비어 있으면 이전 계정의 코드를 잔존시키지 말고 비운다(누설 방지).
    // 로그인 흐름에서 비어 있으면 setFriendCode("") 로 새 코드를 생성·저장해 안정화한다.
    friendCode:
      typeof data.friend_code === "string" && data.friend_code.trim()
        ? (data.friend_code as string)
        : "",
  };
  persist();
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncProfileFromSupabase(), 400);
  });
}
