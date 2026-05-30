import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { getProfile } from "@/shared/stores/profile-store";

/**
 * 마이룸 방명록 — 이웃 방에 놀러가 도장(스탬프)+한 줄을 남기는 기능.
 *
 * 저장 전략: localStorage 캐시(즉시 표시) + best-effort Supabase(`guestbook` 테이블).
 * 테이블/컬럼이 없으면 Supabase 호출은 조용히 무시되고 로컬 캐시로만 동작한다
 * (앱 다른 스토어들과 동일한 graceful degradation — 데모/같은 기기에서는 그대로 동작).
 *
 * 방 주인 식별은 닉네임(owner) 기준 — 친구 프로필이 URL 닉네임으로 식별되는
 * 현재 구조(otherFurniture 조회 등)와 일관성을 맞춘 것. 닉네임 변경 시 옛 닉네임으로
 * 남겨진 방명록은 분리되지만, MVP 범위에서는 허용한다.
 */

export type GuestbookEntry = {
  id: string;
  /** 방 주인 닉네임 */
  owner: string;
  /** 방명록 남긴 사람 닉네임 */
  authorNickname: string;
  /** 방명록 남긴 사람 전화(있으면) — 신원/삭제 권한 판정용 */
  authorPhone?: string;
  /** 한 줄 메시지 */
  message: string;
  /** 도장 이모지 */
  stamp: string;
  /** epoch ms */
  createdAt: number;
};

/** 선택 가능한 도장 이모지 */
export const GUESTBOOK_STAMPS = ["👍", "❤️", "🎉", "☕", "🌸", "🐾", "✨", "🍀"] as const;

const STORAGE_KEY = "holo:guestbook:v1";

/** owner 닉네임 → 방명록 배열 (최신이 앞) */
type Cache = Record<string, GuestbookEntry[]>;

function loadCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Cache;
    }
  } catch {
    // ignore
  }
  return {};
}

let cache: Cache = loadCache();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore (quota / private mode)
  }
}

function getCached(owner: string): GuestbookEntry[] {
  return cache[owner] ?? [];
}

function setCached(owner: string, entries: GuestbookEntry[]) {
  cache = { ...cache, [owner]: entries };
  persist();
}

/** Supabase row → GuestbookEntry */
function rowToEntry(r: Record<string, unknown>): GuestbookEntry {
  return {
    id: String(r.id),
    owner: String(r.owner_nickname ?? ""),
    authorNickname: String(r.author_nickname ?? "이웃"),
    authorPhone: r.author_phone ? String(r.author_phone) : undefined,
    message: String(r.message ?? ""),
    stamp: String(r.stamp ?? "👍"),
    createdAt: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
  };
}

/** Supabase 에서 owner 방명록을 읽어온다. 실패/미존재 시 null. */
async function fetchFromSupabase(owner: string): Promise<GuestbookEntry[] | null> {
  try {
    const { data, error } = await supabase
      .from("guestbook")
      .select("id, owner_nickname, author_nickname, author_phone, message, stamp, created_at")
      .eq("owner_nickname", owner)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return null;
    if (!Array.isArray(data)) return null;
    return data.map((r) => rowToEntry(r as Record<string, unknown>));
  } catch {
    return null;
  }
}

/**
 * 방명록 한 건 작성.
 * - 낙관적으로 캐시에 먼저 반영(즉시 화면 표시)
 * - best-effort 로 Supabase insert (테이블 없으면 무시)
 * 반환: 생성된 엔트리.
 */
export async function addGuestbookEntry(input: {
  owner: string;
  message: string;
  stamp: string;
}): Promise<GuestbookEntry> {
  const profile = getProfile();
  const phone = getCurrentAccount() ?? undefined;
  const entry: GuestbookEntry = {
    id: `gb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    owner: input.owner,
    authorNickname: profile.nickname || "이웃",
    authorPhone: phone,
    message: input.message.trim().slice(0, 80),
    stamp: input.stamp,
    createdAt: Date.now(),
  };

  setCached(input.owner, [entry, ...getCached(input.owner)]);

  // best-effort 서버 저장 (테이블/컬럼 없으면 조용히 무시)
  supabase
    .from("guestbook")
    .insert({
      id: entry.id,
      owner_nickname: entry.owner,
      author_nickname: entry.authorNickname,
      author_phone: entry.authorPhone ?? null,
      message: entry.message,
      stamp: entry.stamp,
    })
    .then(({ error }) => {
      if (error) console.warn("방명록 저장 실패(로컬만 유지):", error.message);
    });

  return entry;
}

/** 방명록 한 건 삭제 — 방 주인 또는 작성자만. 낙관적 반영 + best-effort 서버 삭제. */
export async function removeGuestbookEntry(owner: string, id: string): Promise<void> {
  setCached(
    owner,
    getCached(owner).filter((e) => e.id !== id),
  );
  supabase
    .from("guestbook")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn("방명록 삭제 실패:", error.message);
    });
}

/**
 * owner 의 방명록을 구독하는 훅.
 * - 마운트/owner 변경 시 캐시를 즉시 반환하고, Supabase 에서 최신본을 가져와 갱신.
 * - addEntry / removeEntry 로 작성·삭제 (낙관적 갱신).
 */
export function useGuestbook(owner: string | undefined) {
  const [entries, setEntries] = useState<GuestbookEntry[]>(() =>
    owner ? getCached(owner) : [],
  );

  useEffect(() => {
    if (!owner) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    // 1) 캐시 즉시 표시
    setEntries(getCached(owner));
    // 2) 서버 최신본으로 갱신 (있을 때만).
    //    단, 서버 응답이 도착하기 전에 낙관적으로 추가된 로컬 엔트리(insert 가 아직
    //    반영 안 됨)는 서버 목록에 없을 수 있으므로, id 기준으로 병합해 보존한다.
    //    (이전엔 통째로 덮어써서 동시 추가 시 방금 남긴 방명록이 캐시에서 유실됐다.)
    fetchFromSupabase(owner).then((rows) => {
      if (cancelled || !rows) return;
      const serverIds = new Set(rows.map((e) => e.id));
      const localOnly = getCached(owner).filter((e) => !serverIds.has(e.id));
      const merged = [...localOnly, ...rows].sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      setCached(owner, merged);
      setEntries(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const addEntry = useCallback(
    async (message: string, stamp: string) => {
      if (!owner || !message.trim()) return;
      const entry = await addGuestbookEntry({ owner, message, stamp });
      setEntries((prev) => [entry, ...prev]);
    },
    [owner],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!owner) return;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await removeGuestbookEntry(owner, id);
    },
    [owner],
  );

  return { entries, addEntry, removeEntry };
}
