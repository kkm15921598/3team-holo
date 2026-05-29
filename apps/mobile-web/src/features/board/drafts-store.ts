// 임시저장 store — BoardDraftsScreen ↔ BoardWriteScreen 공유.
// localStorage 에 영속화되어 새로고침/재방문에도 사용자가 저장한 임시글이 유지된다.
// (이전엔 메모리 변수에만 있어 새로고침 시 모두 사라지고 모든 사용자가 같은 샘플 3건을 공유했음)

export type Draft = {
  id: string;
  title: string;
  description: string;
};

const STORAGE_KEY = "holo:drafts:v1";

function load(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Draft[];
    }
  } catch {
    // ignore
  }
  return [];
}

let _drafts: Draft[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_drafts));
  } catch {
    // ignore (quota / private mode)
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export const draftsStore = {
  getDrafts(): Draft[] {
    return _drafts;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  upsert(draft: Draft): void {
    const idx = _drafts.findIndex((d) => d.id === draft.id);
    if (idx >= 0) {
      const next = [..._drafts];
      next[idx] = draft;
      _drafts = next;
    } else {
      _drafts = [draft, ..._drafts];
    }
    persist();
    notify();
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    _drafts = _drafts.filter((d) => !set.has(d.id));
    persist();
    notify();
  },
  /** 신규 가입 시 임시저장 모두 비움 */
  clearAll(): void {
    _drafts = [];
    persist();
    notify();
  },
};
