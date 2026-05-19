/**
 * 개인정보 / 광고 설정 저장소.
 *
 * 사용자가 "개인정보" 페이지에서 켠 토글값을 localStorage 에 영속화하고,
 * React 컴포넌트에서 useSyncExternalStore 로 구독해 즉시 반영되게 한다.
 *
 *   - shareLocation: 위치 정보 공유 (동네 인증 / 지도)
 *   - allowFriendRequest: 친구 요청 허용 (다른 사용자가 요청 보낼 수 있는지)
 *   - marketing: 맞춤 광고 / 관심사 기반 추천 수신
 *
 * 기본값은 모두 true — 가입 직후 사용자가 별도로 비활성화하기 전까지 활성 상태.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

function syncToSupabase(s: PrivacySettings) {
  const userPhone = getCurrentAccount();
  if (!userPhone) return;
  supabase.from("users").update({ privacy_settings: s })
    .eq("phone", userPhone).then(({ error }) => {
      if (error) console.warn("Supabase 개인정보설정 저장 실패:", error.message);
    });
}

const STORAGE_KEY = "holo:privacy:v1";

export type PrivacySettings = {
  shareLocation: boolean;
  allowFriendRequest: boolean;
  marketing: boolean;
};

const DEFAULTS: PrivacySettings = {
  shareLocation: true,
  allowFriendRequest: true,
  marketing: true,
};

function load(): PrivacySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      shareLocation:
        typeof parsed.shareLocation === "boolean"
          ? parsed.shareLocation
          : DEFAULTS.shareLocation,
      allowFriendRequest:
        typeof parsed.allowFriendRequest === "boolean"
          ? parsed.allowFriendRequest
          : DEFAULTS.allowFriendRequest,
      marketing:
        typeof parsed.marketing === "boolean"
          ? parsed.marketing
          : DEFAULTS.marketing,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(s: PrivacySettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // best-effort — quota/private 모드 무시.
  }
}

let _state: PrivacySettings = load();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): PrivacySettings {
  return _state;
}

export const privacyStore = {
  get(): PrivacySettings {
    return _state;
  },
  set<K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]): void {
    if (_state[key] === value) return;
    _state = { ..._state, [key]: value };
    save(_state);
    notify();
    syncToSupabase(_state);
  },
};

/** React: 개인정보 설정 전체를 구독. 변경 시 자동 re-render. */
export function usePrivacy(): PrivacySettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
