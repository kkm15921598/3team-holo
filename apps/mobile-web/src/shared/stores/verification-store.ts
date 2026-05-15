/**
 * 인증 상태 store
 * - 휴대폰 인증
 * - 동네(지역) 인증
 * - 본인인증 성별 (주민번호 뒷자리 첫 숫자로 판단되는 가입 시점의 성별)
 *
 * account-screen 에서 로그인 계정 옆 배지를 결정하는 데 사용된다.
 * 둘 다 인증되어야 "인증완료" 로 표시한다.
 * 성별은 프로필 편집 화면에서 캐릭터 선택지 필터에 사용된다.
 */

export type Gender = "M" | "F";

let _state: {
  phoneVerified: boolean;
  regionVerified: boolean;
  /** 본인인증 시 자동 판단되는 성별. mock 환경에서는 ME_PERSONA가 여성이므로 기본 "F". */
  gender: Gender;
} = {
  phoneVerified: false,
  regionVerified: false,
  gender: "F",
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getVerification() {
  return _state;
}

export function setPhoneVerified(v: boolean) {
  if (_state.phoneVerified === v) return;
  _state = { ..._state, phoneVerified: v };
  notify();
}

export function setRegionVerified(v: boolean) {
  if (_state.regionVerified === v) return;
  _state = { ..._state, regionVerified: v };
  notify();
}

export function setGender(g: Gender) {
  if (_state.gender === g) return;
  _state = { ..._state, gender: g };
  notify();
}

export function subscribeVerification(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 휴대폰 + 지역 둘 다 인증되어야 true */
export function isFullyVerified() {
  return _state.phoneVerified && _state.regionVerified;
}
