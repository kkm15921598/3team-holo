// Module-level draft store shared between BoardDraftsScreen and BoardWriteScreen.
// Mock-only — survives in-app navigation but resets on full page reload.

export type Draft = {
  id: string;
  title: string;
  description: string;
};

const SAMPLE_DRAFTS: Draft[] = [
  { id: "d1", title: "점심 번개", description: "오피스 단지 떡볶이 메이트!" },
  { id: "d2", title: "수박 소분", description: "마트에서 산 큰 수박 나눌 분~" },
  { id: "d3", title: "강아지 산책친구 구해요", description: "매주 주말 한강공원 산책" },
];

let _drafts: Draft[] = [...SAMPLE_DRAFTS];
const listeners = new Set<() => void>();

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
    notify();
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    _drafts = _drafts.filter((d) => !set.has(d.id));
    notify();
  },
  /** 신규 가입 시 임시저장 모두 비움 */
  clearAll(): void {
    _drafts = [];
    notify();
  },
};
