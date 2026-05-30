// 임시저장 store — BoardDraftsScreen ↔ BoardWriteScreen 공유.
// localStorage 에 영속화되어 새로고침/재방문에도 사용자가 저장한 임시글이 유지된다.
// (이전엔 메모리 변수에만 있어 새로고침 시 모두 사라지고 모든 사용자가 같은 샘플 3건을 공유했음)

import type { PostLocation } from "@/shared/mock/data";

export type Draft = {
  id: string;
  title: string;
  description: string;
  // 아래는 모임 글 임시저장 복원용 — 없으면 단순 글로 취급(하위호환).
  // (이전엔 title/description 만 저장해, 모임 글을 임시저장하면 카테고리·사진·장소·
  //  인원·일정이 모두 사라지고 자유게시판 단순글로 둔갑했다.)
  category?: string; // 카테고리 ID
  meetupType?: string | null;
  eventDate?: string;
  endDate?: string;
  eventTime?: string;
  peopleCount?: number | null;
  place?: string;
  postLocation?: PostLocation | null;
  photoUrls?: string[];
};

const STORAGE_KEY = "holo:drafts:v1";
// 사진(data URL, 수 MB)은 localStorage 할당량(보통 5~10MB)을 쉽게 넘겨, 같이 저장하면
// setItem 이 통째로 실패해 다른 임시글까지 전부 유실됐다. 사진만 sessionStorage(draft id 키)로
// 분리 저장하고, localStorage 에는 가벼운 본문 메타만 둔다. (탭 세션 동안 복원 동작 유지)
const PHOTO_KEY_PREFIX = "holo:draft-photos:";

function readPhotos(id: string): string[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(PHOTO_KEY_PREFIX + id);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as string[])
      : undefined;
  } catch {
    return undefined;
  }
}

function writePhotos(id: string, photos: string[] | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (photos && photos.length > 0) {
      window.sessionStorage.setItem(PHOTO_KEY_PREFIX + id, JSON.stringify(photos));
    } else {
      window.sessionStorage.removeItem(PHOTO_KEY_PREFIX + id);
    }
  } catch {
    // ignore (quota / private mode) — 사진 미저장돼도 본문 draft 는 보존된다.
  }
}

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
    // 세션에 보관된 사진을 본문 메타에 다시 합쳐 반환(호출부의 d.photoUrls 그대로 동작).
    return _drafts.map((d) => {
      const photos = readPhotos(d.id);
      return photos ? { ...d, photoUrls: photos } : d;
    });
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  upsert(draft: Draft): void {
    // 사진은 sessionStorage 로 분리, localStorage 에는 사진 없는 가벼운 메타만 저장.
    writePhotos(draft.id, draft.photoUrls);
    const { photoUrls: _omit, ...rest } = draft;
    void _omit;
    const clean = rest as Draft;
    const idx = _drafts.findIndex((d) => d.id === clean.id);
    if (idx >= 0) {
      const next = [..._drafts];
      next[idx] = clean;
      _drafts = next;
    } else {
      _drafts = [clean, ..._drafts];
    }
    persist();
    notify();
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    ids.forEach((id) => writePhotos(id, undefined));
    _drafts = _drafts.filter((d) => !set.has(d.id));
    persist();
    notify();
  },
  /** 신규 가입 시 임시저장 모두 비움 */
  clearAll(): void {
    if (typeof window !== "undefined") {
      try {
        Object.keys(window.sessionStorage)
          .filter((k) => k.startsWith(PHOTO_KEY_PREFIX))
          .forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
    _drafts = [];
    persist();
    notify();
  },
};
