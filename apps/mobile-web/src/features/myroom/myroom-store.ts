import { useSyncExternalStore } from "react";
import { DEFAULT_ROOM, type PlacedFurniture } from "./myroom-data";

const STORAGE_KEY = "holo:myroom:v1";

function loadInitial(): PlacedFurniture[] {
  if (typeof window === "undefined") return DEFAULT_ROOM;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROOM;
}

let state: PlacedFurniture[] = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (quota / private mode)
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setMyroomItems(items: PlacedFurniture[]) {
  state = items;
  persist();
  emit();
}

export function getMyroomItems(): PlacedFurniture[] {
  return state;
}

export function resetMyroomItems() {
  setMyroomItems(DEFAULT_ROOM);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

export function useMyroomItems(): PlacedFurniture[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ─── 레벨 추적 (NEW 뱃지 표시용) ─────────────────────────
const LEVEL_KEY = "holo:myroom:lastSeenLevel";

/** 마지막으로 카탈로그를 본 시점의 레벨. 처음이면 currentLevel - 2 로 초기화해 최근 해금 데모. */
export function getLastSeenLevel(currentLevel: number): number {
  if (typeof window === "undefined") return currentLevel;
  try {
    const v = window.localStorage.getItem(LEVEL_KEY);
    if (v !== null && v !== "") return Number(v);
  } catch {
    // ignore
  }
  return Math.max(0, currentLevel - 2);
}

/** 카탈로그를 본 시점의 레벨을 저장 → 이후로는 NEW 뱃지가 사라짐 */
export function setLastSeenLevel(level: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEVEL_KEY, String(level));
  } catch {
    // ignore
  }
}

/** 아이템이 "이번 레벨업으로 막 해금됐는지" 판정 */
export function isNewlyUnlocked(
  lockedAt: number | undefined,
  currentLevel: number,
  lastSeen: number,
): boolean {
  if (lockedAt === undefined) return false;
  return lockedAt > lastSeen && lockedAt <= currentLevel;
}

// ─── 소유 여부 (구매 / 보관함) ─────────────────────────────
const OWNED_KEY = "holo:myroom:owned";

function defaultOwned(): Set<string> {
  // 가입 시 기본으로 가지고 있는 가구 = DEFAULT_ROOM 에 들어있는 4종
  return new Set(DEFAULT_ROOM.map((i) => `${i.kind}:${i.variant}`));
}

function loadOwned(): Set<string> {
  if (typeof window === "undefined") return defaultOwned();
  try {
    const raw = window.localStorage.getItem(OWNED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr);
    }
  } catch {
    // ignore
  }
  return defaultOwned();
}

let ownedState: Set<string> = loadOwned();
const ownedListeners = new Set<() => void>();

function persistOwned() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OWNED_KEY, JSON.stringify([...ownedState]));
  } catch {
    // ignore
  }
}

function emitOwned() {
  ownedListeners.forEach((l) => l());
}

/** 구매 → 소유 목록에 추가 */
export function purchaseItem(kind: string, variant: string): void {
  const next = new Set(ownedState);
  next.add(`${kind}:${variant}`);
  ownedState = next;
  persistOwned();
  emitOwned();
}

/** 소유 여부 조회 */
export function isOwned(kind: string, variant: string): boolean {
  return ownedState.has(`${kind}:${variant}`);
}

const ownedSubscribe = (cb: () => void) => {
  ownedListeners.add(cb);
  return () => {
    ownedListeners.delete(cb);
  };
};
const ownedSnapshot = () => ownedState;

/** 소유 목록을 React 컴포넌트에서 구독 */
export function useOwnedSet(): Set<string> {
  return useSyncExternalStore(ownedSubscribe, ownedSnapshot, ownedSnapshot);
}

// ─── 포인트 (구매 시 차감) ───────────────────────────────
const POINTS_KEY = "holo:myroom:points";
const DEFAULT_POINTS = 0; // 신규 가입자는 0P 에서 시작 (가입 완료 시 +500P 지급)

function loadPoints(): number {
  if (typeof window === "undefined") return DEFAULT_POINTS;
  try {
    const v = window.localStorage.getItem(POINTS_KEY);
    if (v !== null && v !== "") return Number(v);
  } catch {
    // ignore
  }
  return DEFAULT_POINTS;
}

let pointsState: number = loadPoints();
const pointsListeners = new Set<() => void>();

function persistPoints() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POINTS_KEY, String(pointsState));
  } catch {
    // ignore
  }
}

function emitPoints() {
  pointsListeners.forEach((l) => l());
}

/** 포인트 차감 (음수 방지). 부족하면 false 리턴 */
export function spendPoints(amount: number): boolean {
  if (pointsState < amount) return false;
  pointsState -= amount;
  persistPoints();
  emitPoints();
  return true;
}

/** 포인트 적립 (가입 보너스·이벤트 등) */
export function addPoints(amount: number): void {
  if (amount <= 0) return;
  pointsState += amount;
  persistPoints();
  emitPoints();
}

/** 현재 포인트 (구독 안 함) */
export function getPoints(): number {
  return pointsState;
}

const pointsSubscribe = (cb: () => void) => {
  pointsListeners.add(cb);
  return () => {
    pointsListeners.delete(cb);
  };
};
const pointsSnapshot = () => pointsState;

/** 포인트를 React 컴포넌트에서 구독 */
export function usePoints(): number {
  return useSyncExternalStore(pointsSubscribe, pointsSnapshot, pointsSnapshot);
}

// ─── 상태 메시지 ─────────────────────────────────────────
const STATUS_KEY = "holo:myroom:status";
const DEFAULT_STATUS = "상태 메시지";

function loadStatus(): string {
  if (typeof window === "undefined") return DEFAULT_STATUS;
  try {
    const v = window.localStorage.getItem(STATUS_KEY);
    if (v !== null) return v;
  } catch {
    // ignore
  }
  return DEFAULT_STATUS;
}

let statusState: string = loadStatus();
const statusListeners = new Set<() => void>();

function persistStatus() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATUS_KEY, statusState);
  } catch {
    // ignore
  }
}

function emitStatus() {
  statusListeners.forEach((l) => l());
}

/** 상태 메시지 변경 (max 30자 권장) */
export function setStatusMessage(msg: string): void {
  statusState = msg.trim() || DEFAULT_STATUS;
  persistStatus();
  emitStatus();
}

const statusSubscribe = (cb: () => void) => {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
};
const statusSnapshot = () => statusState;

/** 상태 메시지 React 구독 */
export function useStatusMessage(): string {
  return useSyncExternalStore(statusSubscribe, statusSnapshot, statusSnapshot);
}

// ─── 상태 메시지 위치 ─────────────────────────────────────
const STATUS_POS_KEY = "holo:myroom:statusPos";
const DEFAULT_STATUS_POS = { x: 220, y: 110 };

function loadStatusPos(): { x: number; y: number } {
  if (typeof window === "undefined") return DEFAULT_STATUS_POS;
  try {
    const raw = window.localStorage.getItem(STATUS_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATUS_POS;
}

let statusPosState: { x: number; y: number } = loadStatusPos();
const statusPosListeners = new Set<() => void>();

function persistStatusPos() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATUS_POS_KEY, JSON.stringify(statusPosState));
  } catch {
    // ignore
  }
}

export function setStatusPosition(pos: { x: number; y: number }): void {
  statusPosState = pos;
  persistStatusPos();
  statusPosListeners.forEach((l) => l());
}

const statusPosSubscribe = (cb: () => void) => {
  statusPosListeners.add(cb);
  return () => {
    statusPosListeners.delete(cb);
  };
};
const statusPosSnapshot = () => statusPosState;

export function useStatusPosition(): { x: number; y: number } {
  return useSyncExternalStore(statusPosSubscribe, statusPosSnapshot, statusPosSnapshot);
}
