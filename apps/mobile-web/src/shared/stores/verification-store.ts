/**
 * 인증 상태 store
 * - 휴대폰 인증
 * - 동네(지역) 인증 + 인증한 동(洞) 이름
 * - 본인인증 성별 (주민번호 뒷자리 첫 숫자로 판단되는 가입 시점의 성별)
 *
 * account-screen 에서 로그인 계정 옆 배지를 결정하는 데 사용된다.
 * 둘 다 인증되어야 "인증완료" 로 표시한다.
 * 성별은 프로필 편집 화면에서 캐릭터 선택지 필터에 사용된다.
 *
 * ── 영속화 ──────────────────────────────────────────────
 * 이전엔 모듈 메모리에만 보관해 로그인 화면으로 이동/새로고침 시 인증 상태가
 * 통째로 사라졌다. 그 결과 사용자가 다시 동네 인증을 거치면 +10P 가 중복
 * 적립되는 버그가 있었다 (실 사용자 신고). 이 모듈은 이제 모든 상태를
 * localStorage 에 저장한다. 마지막 동네 인증 시점(lastRegionVerifiedAt)을
 * 함께 기록해 두어, 같은 인증을 다시 거쳐도 90일 이내에는 포인트가 또
 * 적립되지 않도록 차단한다 (UI 의 "3개월에 한 번 갱신" 정책과 일치).
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

export type Gender = "M" | "F";

type State = {
  phoneVerified: boolean;
  regionVerified: boolean;
  /** 본인인증 시 자동 판단되는 성별. mock 환경에서는 ME_PERSONA가 여성이므로 기본 "F". */
  gender: Gender;
  /** 동네 인증 시 사용자가 확정한 동(洞) 라벨 — 예 "성남시 분당구 정자동". null=미인증. */
  verifiedRegion: string | null;
  /**
   * 마지막 동네 인증 완료 시점 (Date.now() ms).
   * - 한 번도 인증한 적 없으면 null.
   * - 포인트 중복 적립 방지 / 3개월 갱신 시점 판단에 사용.
   */
  lastRegionVerifiedAt: number | null;
};

const DEFAULT_STATE: State = {
  phoneVerified: false,
  regionVerified: false,
  gender: "F",
  verifiedRegion: null,
  lastRegionVerifiedAt: null,
};

const STORAGE_KEY = "holo:verification:v1";

/** 동네 인증 갱신 주기 — 이 간격이 지나야 다시 +10P 적립 가능. UI 안내(3개월)와 동일. */
const REGION_RENEWAL_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000;

function loadInitial(): State {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<State>;
    // 기존 저장본에 새 필드(lastRegionVerifiedAt)가 없을 수 있어 spread 로 병합.
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let _state: State = loadInitial();

const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // ignore (quota / private mode)
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

function setState(patch: Partial<State>) {
  _state = { ..._state, ...patch };
  persist();
  notify();
  // Supabase 동기화 (best-effort)
  const userPhone = getCurrentAccount();
  if (userPhone) {
    supabase.from("users").update({
      phone_verified: _state.phoneVerified,
      region_verified: _state.regionVerified,
      verified_region: _state.verifiedRegion,
      last_region_verified_at: _state.lastRegionVerifiedAt,
    }).eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 인증 저장 실패:", error.message);
    });
  }
}

export function getVerification() {
  return _state;
}

export function setPhoneVerified(v: boolean) {
  if (_state.phoneVerified === v) return;
  setState({ phoneVerified: v });
}

/**
 * 지역 인증 상태 갱신.
 * v=true 인 경우 (이미 true 더라도) lastRegionVerifiedAt 을 현재 시각으로 갱신한다.
 *   → 사용자가 갱신을 위해 재인증할 때 타임스탬프가 갱신되어야 다음 90일이 다시 계산됨.
 * v=false 인 경우 lastRegionVerifiedAt 은 유지 (마지막 적립 시점은 잊지 않음).
 */
export function setRegionVerified(v: boolean) {
  if (v) {
    setState({ regionVerified: true, lastRegionVerifiedAt: Date.now() });
  } else {
    if (_state.regionVerified === false) return;
    setState({ regionVerified: false });
  }
}

// ─── 동네 라벨 계정별 로컬 백업 ──────────────────────────────
// verifiedRegion 이 (a) Supabase verified_region 컬럼 미저장/누락, (b) 로그인 시
// resetVerification 으로 비워진 뒤 sync 가 빈 값을 받아 복원 못 함 — 두 경우에 사라져
// "인증했는데 마이페이지에 동네가 안 뜨는" 문제가 있었다. 계정(phone)별로 라벨을 따로
// 영속화해 두고, 동기화/로그인 후 로컬 백업에서 복원한다(계정 격리 위해 phone 키 사용).
const REGION_BY_PHONE_KEY = "holo:verifiedRegion:byPhone";
function loadRegionMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REGION_BY_PHONE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}
function saveRegionForPhone(phone: string, region: string) {
  if (typeof window === "undefined") return;
  try {
    const map = loadRegionMap();
    map[phone] = region;
    window.localStorage.setItem(REGION_BY_PHONE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
export function getVerifiedRegionForPhone(phone: string): string | null {
  return loadRegionMap()[phone] ?? null;
}

/** 휴대폰 번호 변경 시 동네 라벨 백업도 새 번호로 이전(phone 이 계정 식별자이므로). */
export function renameRegionBackup(oldPhone: string, newPhone: string) {
  if (typeof window === "undefined" || !oldPhone || !newPhone || oldPhone === newPhone) return;
  try {
    const map = loadRegionMap();
    if (map[oldPhone] != null) {
      map[newPhone] = map[oldPhone];
      delete map[oldPhone];
      window.localStorage.setItem(REGION_BY_PHONE_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

/** 인증한 동네 라벨 저장 (인증 완료와 동시에 호출) */
export function setVerifiedRegion(region: string | null) {
  // 계정별 로컬 백업에 먼저 기록 — sync/리셋으로 _state 가 비워져도 복원 가능.
  const phone = getCurrentAccount();
  if (phone && region) saveRegionForPhone(phone, region);
  if (_state.verifiedRegion === region) return;
  setState({ verifiedRegion: region });
}

export function setGender(g: Gender) {
  if (_state.gender === g) return;
  setState({ gender: g });
}

export function subscribeVerification(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 휴대폰 + 지역 둘 다 인증되어야 true */
export function isFullyVerified() {
  return _state.phoneVerified && _state.regionVerified;
}

/**
 * 모든 인증 상태를 기본값(미인증)으로 되돌린다.
 * - 신규 가입(fresh-signup-reset) 직후
 * - 테스트 계정 로그인(seedAccount) 직후 — 이전 계정의 인증이 누설되는 것을 방지
 *   (이전엔 verifiedRegion 이 localStorage 에 박혀서 다른 계정에 그대로 노출됐음)
 */
export function resetVerification() {
  _state = { ...DEFAULT_STATE };
  persist();
  notify();
}

/**
 * 지금 동네 인증을 완료하면 +10P 를 적립할 자격이 되는지 판정.
 * - 한 번도 적립한 적 없으면 (lastRegionVerifiedAt === null) → true
 * - 마지막 적립으로부터 갱신 주기(90일) 이상 지났으면 → true
 * - 그 외 (이미 최근에 적립함) → false
 *
 * 호출 측 (verify-region-screen) 에서 setRegionVerified() 를 호출하기 전에
 * 평가해야 정확하다 (호출 후엔 lastRegionVerifiedAt 이 now 로 갱신되어 항상 false).
 */
export function canEarnRegionVerifyPoints(): boolean {
  const last = _state.lastRegionVerifiedAt;
  // 이미 인증됐는데 시점만 비어있는 모순 상태는 적립 불가로 본다(중복 적립 차단).
  if (_state.regionVerified && last === null) return false;
  if (last === null) return true;
  return Date.now() - last >= REGION_RENEWAL_INTERVAL_MS;
}

/**
 * 지금 동네 "재인증" 이 가능한지 판정 — 갱신 주기(3개월)에 한 번만 허용.
 * - 한 번도 인증한 적 없으면 (lastRegionVerifiedAt === null) → true
 * - 마지막 인증으로부터 90일 이상 지났으면 → true
 * - 그 외 (최근 90일 내 이미 인증) → false  (재인증 차단)
 *
 * 이전엔 적립 자격(canEarnRegionVerifyPoints)만 막고 재인증 행위 자체는 항상
 * 허용돼서, 사용자가 90일 안에도 동네를 계속 바꿔 인증할 수 있었다.
 */
export function canReVerifyRegion(): boolean {
  // 인증됐는데 시점만 비어있는 모순 상태는 재인증 불가(90일 우회 차단).
  if (_state.regionVerified && _state.lastRegionVerifiedAt === null) return false;
  if (!_state.regionVerified || _state.lastRegionVerifiedAt === null) return true;
  return Date.now() - _state.lastRegionVerifiedAt >= REGION_RENEWAL_INTERVAL_MS;
}

/** 다음 재인증이 가능해지는 시점(ms). 인증 이력이 없으면 null(지금 가능). */
export function nextRegionVerifyAt(): number | null {
  if (_state.lastRegionVerifiedAt === null) return null;
  return _state.lastRegionVerifiedAt + REGION_RENEWAL_INTERVAL_MS;
}

/** React 컴포넌트에서 인증 상태 전체를 구독 */
export function useVerification() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => _state,
    () => _state,
  );
}

/**
 * Supabase users 테이블에서 인증 상태 읽어와 로컬 상태 갱신.
 */
export async function syncVerificationFromSupabase(): Promise<void> {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  const { data, error } = await supabase
    .from("users")
    .select("phone_verified, region_verified, verified_region, last_region_verified_at")
    .eq("phone", userPhone)
    .single();
  if (error || !data) return;
  // 동네 라벨: Supabase 값이 비문자열/빈문자열이면(컬럼 미저장 등) 로컬 상태 → 계정별 백업 순으로 복원.
  // (빈 값이 로컬 라벨을 덮어써 마이페이지에서 동네가 사라지던 문제 방지)
  const remoteRegion =
    typeof data.verified_region === "string" && data.verified_region
      ? data.verified_region
      : null;
  _state = {
    ..._state,
    phoneVerified: (data.phone_verified as boolean) ?? _state.phoneVerified,
    regionVerified: (data.region_verified as boolean) ?? _state.regionVerified,
    verifiedRegion:
      remoteRegion ?? _state.verifiedRegion ?? getVerifiedRegionForPhone(userPhone),
    lastRegionVerifiedAt: (data.last_region_verified_at as number | null) ?? _state.lastRegionVerifiedAt,
  };
  // 모순 상태 보정: 인증은 됐는데 시점이 비어있는 레거시 계정(서버 컬럼 누락)은
  // 시점을 현재로 백필한다. 안 하면 regionVerified=true & last=null 이 되어
  // 90일 정책을 무시하고 +10P 재적립/재인증 우회가 가능했다.
  if (_state.regionVerified && _state.lastRegionVerifiedAt === null) {
    _state = { ..._state, lastRegionVerifiedAt: Date.now() };
  }
  persist();
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => syncVerificationFromSupabase(), 550);
  });
}
