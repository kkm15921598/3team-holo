/**
 * 계정 phone 별로 사용자가 직접 선택한 값 (장착 뱃지 / 칭호 등) 을 저장.
 *
 * - profile-store 는 "현재 로그인된 사용자의" 단일 상태만 들고 있어서
 *   계정 전환 시 직전 사용자의 선택이 덮어써진다.
 * - 이 store 는 phone → choices 매핑을 따로 보관해서, 로그아웃했다가
 *   같은 계정으로 다시 로그인했을 때 마지막 선택을 복원한다.
 */

const STORAGE_KEY = "holo:account-choices:v1";
const CURRENT_KEY = "holo:current-account-phone:v1";

export type AccountChoices = {
  equippedBadgeId?: string;
  title?: string;
};

function loadInitial(): Record<string, AccountChoices> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, AccountChoices>;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

function loadCurrentPhone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

let state: Record<string, AccountChoices> = loadInitial();
let currentPhone: string | null = loadCurrentPhone();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function persistCurrent() {
  if (typeof window === "undefined") return;
  try {
    if (currentPhone) {
      window.localStorage.setItem(CURRENT_KEY, currentPhone);
    } else {
      window.localStorage.removeItem(CURRENT_KEY);
    }
  } catch {
    // ignore
  }
}

/** 로그인 시 현재 계정 설정 — 이후의 saveChoice 들이 이 phone 으로 저장됨 */
export function setCurrentAccount(phone: string): void {
  currentPhone = phone;
  persistCurrent();
}

export function getCurrentAccount(): string | null {
  return currentPhone;
}

/** 사용자가 뱃지/칭호 등 선택 시 호출 */
export function saveChoice<K extends keyof AccountChoices>(
  field: K,
  value: AccountChoices[K],
): void {
  if (!currentPhone) return;
  state = {
    ...state,
    [currentPhone]: { ...state[currentPhone], [field]: value },
  };
  persist();
}

/** 특정 계정의 저장된 선택 조회 (로그인 시 복원용) */
export function getChoices(phone: string): AccountChoices {
  return state[phone] ?? {};
}
