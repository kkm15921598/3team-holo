import type { Post } from "@/shared/mock/data";
// Supabase 기반 posts store.
// - 앱 시작 시 Supabase에서 글 목록을 불러온다.
// - Supabase가 비어있으면 mock 데이터를 fallback으로 보여준다.
// - 새 글 작성/수정/삭제는 Supabase에 반영된다.

import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";

/** created_at timestamp → "방금 전 / N분 전 / N시간 전 / N일 전 / N주 전 / N개월 전 / N년 전" */
export function computeTimeAgo(createdAt: string | null): string {
  if (!createdAt) return "방금 전";
  // 잘못된 타임스탬프(파싱 실패)는 "NaN주 전" 같은 깨진 라벨 대신 안전 폴백.
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return "방금 전";
  const diffMs = Date.now() - t;
  // 미래 타임스탬프(기기 시계 오차/서버 시차)는 음수가 되어 "NaN" 으로 새지 않게 방어.
  if (diffMs < 0) return "방금 전";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  // 오래된 글: 7주 넘게 "60주 전" 처럼 끝없이 커지지 않도록 개월/년으로 환산.
  if (diffD < 30) return `${Math.floor(diffD / 7)}주 전`;
  if (diffD < 365) return `${Math.floor(diffD / 30)}개월 전`;
  return `${Math.floor(diffD / 365)}년 전`;
}

/** Supabase row → Post 타입으로 변환 (실제 테이블 컬럼명 기준) */
function rowToPost(row: Record<string, unknown>): Post {
  // location: lat/lng/place_name 컬럼 → PostLocation 객체
  const lat = row.lat as number | null;
  const lng = row.lng as number | null;
  const placeName = row.place_name as string | null;
  const location =
    lat != null && lng != null
      ? { lat, lng, placeName: placeName ?? undefined }
      : undefined;

  return {
    id: row.id as string,
    category: (row.category as string) ?? "free",
    status: ((row.status as string) ?? "모집중") as Post["status"],
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    distance: (row.distance as string) ?? "0m",
    duration: (row.duration as string) ?? "0분",
    likes: (row.likes as number) ?? 0,
    comments: (row.comments as number) ?? 0,
    timeAgo: computeTimeAgo(row.created_at as string),
    authorNickname: (row.author_nickname as string) ?? "",
    authorPhone: (row.author_phone as string | null) ?? null,
    authorLevel: (row.author_level as number) ?? 1,
    location,
    participants: row.participants
      ? (row.participants as Post["participants"])
      : undefined,
    meetupType: (row.meetup_type as string) ?? undefined,
    eventDate: (row.event_date as string) ?? undefined,
    eventTime: (row.event_time as string) ?? undefined,
    photoUrls: row.photo_urls
      ? (row.photo_urls as string[])
      : undefined,
    endDate: (row.end_date as string) ?? undefined,
    peopleCount:
      row.people_count != null ? (row.people_count as number) : null,
    place: (row.place as string) ?? undefined,
    views: (row.views as number) ?? 0,
  };
}


// 초기값은 mock 데이터 (Supabase 로드 전 빠른 표시)
let _posts: Post[] = [];
// 첫 로드 시도 완료 여부 — 스켈레톤 로딩(로딩 중 vs 진짜 빈 목록 구분)에 사용.
let _loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

/** Supabase에서 글 목록 로드 후 store 갱신 */
async function loadFromSupabase() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    // is_deleted 가 false 이거나 NULL 인 행을 모두 포함.
    // (.neq("is_deleted", true) 는 SQL 3치논리상 NULL 행을 제외해버려, 명시적 false 저장
    //  이전에 만들어진 레거시 글이 목록에서 누락됐다 — .or 로 NULL 까지 명시 포함)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("bumped_at", { ascending: false });

  // 성공/실패 무관 — 로드 시도가 끝났으면 스켈레톤을 멈춘다.
  _loaded = true;

  if (error) {
    console.warn("Supabase 글 목록 로드 실패:", error.message);
    notify();
    return;
  }

  if (data && data.length > 0) {
    _posts = data.map(rowToPost);
  } else {
    _posts = [];
  }
  notify();
}

/** Supabase Realtime 구독 — INSERT/UPDATE 이벤트를 로컬 스토어에 즉시 반영.
 *
 * 사전 요건 (Supabase 대시보드 또는 SQL):
 *   ALTER TABLE posts REPLICA IDENTITY FULL;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE posts;
 */
function subscribeToRealtime() {
  supabase
    .channel("posts-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.is_deleted) return;
        const post = rowToPost(row);
        const idx = _posts.findIndex((p) => p.id === post.id);
        if (idx >= 0) {
          // optimistic update 이미 반영됨 — 서버 값(created_at 등)으로 교체
          const next = [..._posts];
          next[idx] = post;
          _posts = next;
        } else {
          // 다른 기기/사용자가 작성한 새 글
          _posts = [post, ..._posts];
        }
        notify();
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "posts" },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (row.is_deleted) {
          // soft delete — 목록에서 제거
          _posts = _posts.filter((p) => p.id !== (row.id as string));
        } else {
          const post = rowToPost(row);
          const idx = _posts.findIndex((p) => p.id === post.id);
          if (idx >= 0) {
            const next = [..._posts];
            next[idx] = post;
            _posts = next;
          }
          // 목록에 없는 row UPDATE는 무시 (is_deleted=false 복구 케이스 등)
        }
        notify();
      },
    )
    .subscribe();
}

// 앱 시작 시 자동 로드 + Realtime 구독
if (typeof window !== "undefined") {
  loadFromSupabase().then(() => subscribeToRealtime());
}

export const postsStore = {
  getPosts(): Post[] {
    return _posts;
  },
  /** 첫 Supabase 로드 시도가 끝났는지 — 스켈레톤(로딩) vs 빈 목록 구분용. */
  isLoaded(): boolean {
    return _loaded;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** 새 글 추가 — 로컬 즉시 반영 + Supabase 저장 */
  prepend(post: Post): void {
    _posts = [post, ..._posts];
    notify();
    const userPhone = getCurrentAccount();
    supabase.from("posts").insert({
      id: post.id,
      category: post.category,
      status: post.status,
      title: post.title,
      description: post.description,
      distance: post.distance ?? "0m",
      duration: post.duration ?? "0분",
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      author_nickname: post.authorNickname,
      author_phone: userPhone ?? null,
      author_level: post.authorLevel ?? 1,
      lat: post.location?.lat ?? null,
      lng: post.location?.lng ?? null,
      place_name: post.location?.placeName ?? null,
      meetup_type: post.meetupType ?? null,
      event_date: post.eventDate ?? null,
      event_time: post.eventTime ?? null,
      photo_urls: post.photoUrls ?? null,
      end_date: post.endDate ?? null,
      people_count: post.peopleCount ?? null,
      place: post.place ?? null,
      views: 0,
      bumped_at: new Date().toISOString(),
      is_deleted: false,  // 명시적으로 false 저장 — NULL이면 eq("is_deleted", false) 조회에서 누락됨
    }).then(({ error }) => {
      if (error) console.warn("Supabase 글 저장 실패:", error.message);
    });
  },
  /** 글 수정 — 로컬 즉시 반영 + Supabase 업데이트 */
  update(post: Post): void {
    const idx = _posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      const next = [..._posts];
      next[idx] = post;
      _posts = next;
      notify();
    }
    supabase.from("posts").update({
      category: post.category,
      status: post.status,
      title: post.title,
      description: post.description,
      lat: post.location?.lat ?? null,
      lng: post.location?.lng ?? null,
      place_name: post.location?.placeName ?? null,
      meetup_type: post.meetupType ?? null,
      event_date: post.eventDate ?? null,
      event_time: post.eventTime ?? null,
      photo_urls: post.photoUrls ?? null,
      end_date: post.endDate ?? null,
      people_count: post.peopleCount ?? null,
      place: post.place ?? null,
    }).eq("id", post.id).then(({ error }) => {
      if (error) console.warn("Supabase 글 수정 실패:", error.message);
    });
  },
  /** 끌어올리기 — 최상단 이동 + Supabase bumped_at 갱신 */
  bumpToTop(post: Post): void {
    const idx = _posts.findIndex((p) => p.id === post.id);
    if (idx < 0) return;
    const next = [..._posts];
    next.splice(idx, 1);
    next.unshift({ ...post, timeAgo: "방금 전" });
    _posts = next;
    notify();
    supabase.from("posts").update({ bumped_at: new Date().toISOString() })
      .eq("id", post.id).then(({ error }) => {
        if (error) console.warn("Supabase 끌어올리기 실패:", error.message);
      });
  },
  /** 글 삭제 — 로컬 제거 + Supabase soft delete */
  remove(ids: string[]): void {
    const set = new Set(ids);
    _posts = _posts.filter((p) => !set.has(p.id));
    notify();
    for (const id of ids) {
      supabase.from("posts").update({ is_deleted: true })
        .eq("id", id).then(({ error }) => {
          if (error) console.warn("Supabase 글 삭제 실패:", error.message);
        });
    }
  },
  /** 로컬에만 추가 — 테스트 계정 시드용, Supabase 저장 안 함 */
  prependLocal(post: Post): void {
    _posts = [post, ..._posts];
    notify();
  },
  /** 로컬에서만 제거 — 테스트 계정 시드용, Supabase 건드리지 않음 */
  removeLocal(ids: string[]): void {
    const set = new Set(ids);
    _posts = _posts.filter((p) => !set.has(p.id));
    notify();
  },
  /** 수동 새로고침 */
  async refresh(): Promise<void> {
    await loadFromSupabase();
  },
  /** 좋아요 수 로컬 즉시 반영 (좋아요 토글 시 optimistic update) */
  patchLikes(postId: string, delta: number): void {
    const idx = _posts.findIndex((p) => p.id === postId);
    if (idx < 0) return;
    const next = [..._posts];
    next[idx] = { ...next[idx], likes: Math.max(0, (next[idx].likes ?? 0) + delta) };
    _posts = next;
    notify();
  },
  /** 참여자 추가/제거 — 로컬 즉시 반영 + Supabase 업데이트.
   *  phone(안정 식별자)을 받으면 leave 시 색(avatarBg)이 아니라 phone 으로 정확히 본인 항목만
   *  제거한다 — 6색 풀이라 다른 참여자와 색이 겹치면 남의 표식이 지워지던 버그 방지. */
  patchParticipants(postId: string, avatarBg: string, action: "join" | "leave", phone?: string): void {
    const idx = _posts.findIndex((p) => p.id === postId);
    if (idx < 0) return;
    const post = _posts[idx];
    let participants = [...(post.participants ?? [])];
    if (action === "join") {
      // 같은 phone 이 이미 있으면 중복 추가 방지(재참여/동기화 중복 가드).
      if (!(phone && participants.some((p) => p.phone === phone))) {
        participants = [...participants, phone ? { avatarBg, phone } : { avatarBg }];
      }
    } else {
      // 1순위: phone 일치 항목. 없으면(구 데이터) 색으로 폴백.
      let removeIdx = phone ? participants.findIndex((p) => p.phone === phone) : -1;
      if (removeIdx < 0) removeIdx = participants.findIndex((p) => p.avatarBg === avatarBg && !p.phone);
      if (removeIdx < 0) removeIdx = participants.findIndex((p) => p.avatarBg === avatarBg);
      if (removeIdx >= 0) participants.splice(removeIdx, 1);
    }
    const next = [..._posts];
    next[idx] = { ...post, participants };
    _posts = next;
    notify();
    supabase.from("posts").update({ participants })
      .eq("id", postId).then(({ error }) => {
        if (error) console.warn("Supabase 참여자 업데이트 실패:", error.message);
      });
  },
  /** 조회수 +1 — 로컬 즉시 반영 + Supabase RPC 호출 */
  patchViews(postId: string): void {
    const idx = _posts.findIndex((p) => p.id === postId);
    if (idx >= 0) {
      const next = [..._posts];
      next[idx] = { ...next[idx], views: (next[idx].views ?? 0) + 1 };
      _posts = next;
      notify();
    }
    supabase.rpc("increment_post_views", { post_id: postId }).then(({ error }) => {
      if (error) console.warn("Supabase 조회수 업데이트 실패:", error.message);
    });
  },
  /** 신규 가입 시 mock 초기값으로 리셋 */
  resetToInitial(): void {
    _posts = [];
    notify();
  },
};
