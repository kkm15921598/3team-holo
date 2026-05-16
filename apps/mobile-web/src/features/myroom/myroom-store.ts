import { useSyncExternalStore } from "react";
import { DEFAULT_ROOM, type PlacedFurniture } from "./myroom-data";
import { recordBadgeAcquired } from "@/shared/stores/account-stats-store";

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

/**
 * 신규 가입 시 마이룸 관련 상태를 전부 비움.
 * - 배치된 가구: 빈 방 (DEFAULT_ROOM 대신 빈 배열) — 가입 튜토리얼이 직접 채움
 * - 소유 가구: 빈 set
 * - 포인트: 0
 * - 포인트 이용 내역: 빈 배열
 * - 상태 메시지: 기본값
 */
export function resetMyroomStore(): void {
  state = [];
  persist();
  emit();
  ownedState = new Set();
  persistOwned();
  emitOwned();
  pointsState = 0;
  persistPoints();
  emitPoints();
  historyState = [];
  persistHistory();
  emitHistory();
  statusState = DEFAULT_STATUS;
  persistStatus();
  emitStatus();
  // 일일 cap 리셋
  dailyCaps = { date: todayKey(), counts: {} };
  persistDailyCaps();
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

/** 구매 → 소유 목록에 추가. 소유 가구가 20개를 처음 넘기면 "작은 쇼룸 주인" 뱃지 발급. */
export function purchaseItem(kind: string, variant: string): void {
  const next = new Set(ownedState);
  next.add(`${kind}:${variant}`);
  ownedState = next;
  persistOwned();
  emitOwned();
  // 가구 20개 수집 달성 → badge_25 자동 발급 (이미 보유 시 no-op)
  if (next.size >= 20) {
    recordBadgeAcquired("badge_25");
  }
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

/** 포인트 적립/차감 사유 — 포인트 이용 내역에 표시될 라벨 */
export type PointReason = {
  /** 메인 라벨 (예: "출석체크", "아이템 구매", "글쓰기") */
  title: string;
  /** 부가 설명 (예: 가구 이름, 게시글 제목 등) */
  note?: string;
};

/** 포인트 차감 (음수 방지). 부족하면 false 리턴 */
export function spendPoints(amount: number, reason?: PointReason): boolean {
  if (pointsState < amount) return false;
  pointsState -= amount;
  persistPoints();
  emitPoints();
  if (reason) {
    appendPointEvent({ title: reason.title, note: reason.note, amount: -amount });
  }
  return true;
}

/** 포인트 적립 (가입 보너스·이벤트 등) */
export function addPoints(amount: number, reason?: PointReason): void {
  if (amount <= 0) return;
  pointsState += amount;
  persistPoints();
  emitPoints();
  if (reason) {
    appendPointEvent({ title: reason.title, note: reason.note, amount });
  }
}

/** 포인트 절대값으로 설정 — 테스트 계정 시드 시 사용 */
export function setPoints(amount: number): void {
  pointsState = Math.max(0, Math.floor(amount));
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

// ─── 포인트 이용 내역 (History) ────────────────────────────
/** 포인트가 변동될 때마다 자동으로 누적되는 이용 내역 항목 */
export type PointEvent = {
  id: string;
  /** "YY.MM.DD" 형식 — 화면 표시용 */
  date: string;
  /** 메인 라벨 (예: "출석체크", "아이템 구매") */
  title: string;
  /** 부가 설명 (예: 가구 이름) */
  note?: string;
  /** 적립은 양수, 차감은 음수 */
  amount: number;
};

const HISTORY_KEY = "holo:myroom:pointHistory";

/** 화면 시안 재현용 기본 내역 — 신규 동작이 누적되면 최상단에 쌓인다. */
const DEFAULT_HISTORY: PointEvent[] = [
  { id: "seed-1", date: "26.05.16", title: "친구 초대", amount: 50 },
  { id: "seed-2", date: "26.05.15", title: "단기 모임 참여", note: "바퀴 벌레 잡아 주실분", amount: 20 },
  { id: "seed-3", date: "26.05.10", title: "아이템 구매", note: "노란 원목 침대", amount: -100 },
  { id: "seed-4", date: "26.05.05", title: "아이템 구매", note: "핑크 의자", amount: -50 },
];

function loadHistory(): PointEvent[] {
  if (typeof window === "undefined") return DEFAULT_HISTORY;
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PointEvent[];
    }
  } catch {
    // ignore
  }
  return DEFAULT_HISTORY;
}

let historyState: PointEvent[] = loadHistory();
const historyListeners = new Set<() => void>();

function persistHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(historyState));
  } catch {
    // ignore
  }
}

function emitHistory() {
  historyListeners.forEach((l) => l());
}

function todayDateLabel(): string {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** 내역 항목 추가 — 최신이 맨 위. addPoints/spendPoints 내부에서 자동 호출됨 */
function appendPointEvent(entry: Omit<PointEvent, "id" | "date"> & { date?: string }): void {
  const next: PointEvent = {
    id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: entry.date ?? todayDateLabel(),
    title: entry.title,
    note: entry.note,
    amount: entry.amount,
  };
  historyState = [next, ...historyState];
  persistHistory();
  emitHistory();
}

/** 외부에서 직접 내역만 남기고 싶을 때 (테스트 시드 등) */
export function addPointHistoryEntry(entry: Omit<PointEvent, "id" | "date"> & { date?: string }): void {
  appendPointEvent(entry);
}

/** 현재 내역 (구독 안 함) */
export function getPointHistory(): PointEvent[] {
  return historyState;
}

const historySubscribe = (cb: () => void) => {
  historyListeners.add(cb);
  return () => {
    historyListeners.delete(cb);
  };
};
const historySnapshot = () => historyState;

/** 포인트 이용 내역을 React 컴포넌트에서 구독 */
export function usePointHistory(): PointEvent[] {
  return useSyncExternalStore(historySubscribe, historySnapshot, historySnapshot);
}

// ─── 일일 적립 cap 추적 (글쓰기 등) ────────────────────────
const DAILY_CAP_KEY = "holo:myroom:dailyCaps";

type DailyCapRecord = {
  date: string; // YYYY-MM-DD (자정 reset 키)
  counts: Record<string, number>;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadDailyCaps(): DailyCapRecord {
  if (typeof window === "undefined") return { date: todayKey(), counts: {} };
  try {
    const raw = window.localStorage.getItem(DAILY_CAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyCapRecord;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    // ignore
  }
  return { date: todayKey(), counts: {} };
}

let dailyCaps: DailyCapRecord = loadDailyCaps();

function persistDailyCaps() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DAILY_CAP_KEY, JSON.stringify(dailyCaps));
  } catch {
    // ignore
  }
}

/**
 * 일일 cap 안에서 적립 시도. 성공 시 true 반환, cap 초과 시 false.
 * key 예: "post" (글쓰기 일 6회), "ad" (광고 일 5회)
 */
export function tryDailyEarn(key: string, max: number, amount: number, reason: PointReason): boolean {
  // 날짜가 바뀌었으면 reset
  if (dailyCaps.date !== todayKey()) {
    dailyCaps = { date: todayKey(), counts: {} };
  }
  const cur = dailyCaps.counts[key] ?? 0;
  if (cur >= max) return false;
  dailyCaps.counts[key] = cur + 1;
  persistDailyCaps();
  addPoints(amount, reason);
  return true;
}

/** 오늘 해당 key 로 몇 번 적립했는지 (UI 표시용) */
export function getDailyCount(key: string): number {
  if (dailyCaps.date !== todayKey()) return 0;
  return dailyCaps.counts[key] ?? 0;
}
