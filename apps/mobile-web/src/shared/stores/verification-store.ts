/**
 * 인증 상태 store
 * - 휴대폰 인증
 * - 동네(지역) 인증 + 인증한 동(洞) 이름
 * - 본인인증 성별 (주민번호 뒷자리 첫 숫자로 판단되는 가입 시점의 성별)
 *
 * account-screen 에서 로그인 계정 옆 배지를 결정하는 데 사용된다.
 * 둘 다 인증되어야 "인증완료" 로 표시한다.
 * 성별은 프로필 편집 화면에서 캐릭터 선택지 필터에 사용된다.
 */
import { useSyncExternalStore } from "react";

export type Gender = "M" | "F";

let _state: {
  phoneVerified: boolean;
  regionVerified: boolean;
  /** 본인인증 시 자동 판단되는 성별. mock 환경에서는 ME_PERSONA가 여성이므로 기본 "F". */
  gender: Gender;
  /** 동네 인증 시 사용자가 확정한 동(洞) 라벨 — 예 "성남시 분당구 정자동". null=미인증. */
  verifiedRegion: string | null;
} = {
  phoneVerified: false,
  regionVerified: false,
  gender: "F",
  verifiedRegion: null,
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

/** 인증한 동네 라벨 저장 (인증 완료와 동시에 호출) */
export function setVerifiedRegion(region: string | null) {
  if (_state.verifiedRegion === region) return;
  _state = { ..._state, verifiedRegion: region };
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

/** React 컴포넌트에서 인증 상태 전체를 구독 */
export function useVerification() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => _state,
    () => _state,
  );
}
