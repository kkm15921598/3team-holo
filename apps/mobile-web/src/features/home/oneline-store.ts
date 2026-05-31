import { useSyncExternalStore } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { getProfile, isMyNickname } from "@/shared/stores/profile-store";

/**
 * "동네 한 줄 소식" store — 홈 상단 티커에 흐르는 이웃들의 짧은 휘발성 소식.
 *
 * 게시판 글을 쓰기엔 부담스러운 한 줄 소식("○○빵집 마감세일", "놀이터 분실물 있어요")을
 * 가볍게 남기는 채널. 재방문 동기 + 저진입 참여가 목적.
 *
 * - localStorage 영속(앱 재시작에도 유지) + Supabase best-effort 동기화.
 * - Supabase 테이블(oneline_news)이 없거나 권한이 없어도 로컬로 동작한다(컬럼/테이블 미존재 무시).
 * - 24시간 지난 소식은 자동으로 숨긴다(휘발성).
 */

export type OnelineNews = {
  id: string;
  nickname: string;
  content: string;
  /** 작성 시각(ms) — 24h 만료 판정 */
  createdAt: number;
};

const STORAGE_KEY = "holo:oneline:v1";
const MAX_KEEP = 50; // 로컬 보관 최대 개수
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간 휘발

function loadInitial(): OnelineNews[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as OnelineNews[];
    }
  } catch {
    // ignore
  }
  return [];
}

let state: OnelineNews[] = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/**
 * 만료(24h) 지난 소식 제거 + 최신순 정렬 + 개수 제한.
 * 단, **내가 남긴 소식은 만료에서 제외**한다 — "어제 남긴 내 소식이 사라졌다"는
 * 상실감 방지(사장님 요청). 남의 소식은 24h 휘발 유지(티커 신선도).
 */
function normalize(list: OnelineNews[]): OnelineNews[] {
  const now = Date.now();
  return list
    .filter((n) => isMyNickname(n.nickname) || now - n.createdAt < TTL_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_KEEP);
}

/** 한 줄 소식 작성 — 로컬 즉시 반영 + Supabase best-effort. */
export function addOnelineNews(content: string): void {
  const trimmed = content.trim();
  if (!trimmed) return;
  const phone = getCurrentAccount();
  const news: OnelineNews = {
    id: `ol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nickname: getProfile().nickname || "이웃",
    content: trimmed.slice(0, 60),
    createdAt: Date.now(),
  };
  state = normalize([news, ...state]);
  persist();
  emit();

  // Supabase 저장(best-effort) — 테이블/컬럼 없으면 조용히 무시.
  // 전화번호(PII)는 저장하지 않는다(소식은 누구나 읽음). 소유권은 닉네임으로 판정.
  if (phone) {
    supabase
      .from("oneline_news")
      .insert({
        news_id: news.id,
        nickname: news.nickname,
        content: news.content,
        created_at: new Date(news.createdAt).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn("한 줄 소식 저장 실패(무시):", error.message);
      });
  }
}

/** 내 소식 삭제 — 로컬 제거 + Supabase best-effort. 본인 글만 삭제 가능. */
export function removeOnelineNews(id: string): void {
  // 소유권 확인 — UI 가 본인 글에만 삭제 버튼을 노출하지만, 함수가 직접 호출돼도
  // 남의 글이 안 지워지도록 작성자 닉네임으로 대조(전화번호 PII 미저장). 서버 강제는 RLS=Plan B.
  const target = state.find((n) => n.id === id);
  if (!target) return;
  if (!isMyNickname(target.nickname)) return;

  state = state.filter((n) => n.id !== id);
  persist();
  emit();
  supabase
    .from("oneline_news")
    .delete()
    .eq("news_id", id)
    .then(({ error }) => {
      if (error) console.warn("한 줄 소식 삭제 실패(무시):", error.message);
    });
}

/** Supabase 에서 최근 소식을 읽어 로컬과 병합(best-effort). 테이블 없으면 무시. */
export async function syncOnelineFromSupabase(): Promise<void> {
  const { data, error } = await supabase
    .from("oneline_news")
    .select("news_id, nickname, content, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_KEEP);
  if (error || !data) return; // 테이블 미존재 등 — 로컬만으로 동작
  const remote: OnelineNews[] = data.map((row: any) => ({
    id: String(row.news_id),
    nickname: row.nickname ?? "이웃",
    content: row.content ?? "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  }));
  // 로컬 + 원격 합치고 id 중복 제거.
  const byId = new Map<string, OnelineNews>();
  for (const n of [...remote, ...state]) byId.set(n.id, n);
  state = normalize([...byId.values()]);
  persist();
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
// 만료 항목이 화면에 남지 않도록 snapshot 도 normalize. 단, 참조 안정성을 위해
// 내용이 같으면 같은 배열을 돌려준다(useSyncExternalStore 무한 루프 방지).
let cachedSnapshot: OnelineNews[] = normalize(state);
let cachedKey = "";
function snapshot(): OnelineNews[] {
  const next = normalize(state);
  const key = next.map((n) => n.id).join(",");
  if (key !== cachedKey) {
    cachedKey = key;
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

/** 홈 티커용 — 최신순, 만료 제외 소식 목록 */
export function useOnelineNews(): OnelineNews[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
