import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { getProfile } from "@/shared/stores/profile-store";

/**
 * 모임 후기/평점 — 모임이 끝난 뒤 참석자가 방장에게 별점(1~5)+한 줄 후기를 남긴다.
 * 방장 프로필에 평균 별점·후기 수가 "따뜻한 모임 ⭐4.8 (12)" 형태로 표시된다.
 *
 * 저장: localStorage 캐시(즉시 표시) + best-effort Supabase(`meetup_reviews` 테이블).
 * 테이블/컬럼이 없으면 Supabase 호출은 조용히 무시되고 로컬 캐시로만 동작한다
 * (방명록 스토어와 동일한 graceful degradation). 평점은 다른 사용자가 줘야 의미가 생기므로
 * 오픈(멀티플레이어) 후 실데이터가 쌓인다 — 그 전엔 표시만 준비된 상태.
 *
 * 방장 식별은 닉네임(hostNickname) 기준 — 친구 프로필이 URL 닉네임으로 식별되는 구조와 일관.
 */

export type MeetupReview = {
  id: string;
  /** 후기 대상 모임 게시글 id */
  meetupPostId: string;
  /** 방장(모임 주최자) 닉네임 */
  hostNickname: string;
  /** 방장 전화(있으면) */
  hostPhone?: string;
  /** 후기 작성자 닉네임 */
  reviewerNickname: string;
  /** 후기 작성자 전화(있으면) — 중복 후기/본인 후기 판정 */
  reviewerPhone?: string;
  /** 별점 1~5 */
  rating: number;
  /** 한 줄 후기 (최대 60자) */
  comment: string;
  /** epoch ms */
  createdAt: number;
};

export type HostRating = { avg: number; count: number };

const CACHE_KEY = "holo:meetupReviews:v1"; // host 닉네임 → MeetupReview[]
const REVIEWED_KEY = "holo:meetupReviews:reviewed"; // 내가 후기 남긴 meetupPostId 목록

type Cache = Record<string, MeetupReview[]>;

function loadCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Cache;
    }
  } catch {
    // ignore
  }
  return {};
}

let cache: Cache = loadCache();

function persistCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function loadReviewedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(REVIEWED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set<string>(arr.map(String));
    }
  } catch {
    // ignore
  }
  return new Set();
}

let reviewedSet: Set<string> = loadReviewedSet();

function persistReviewed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEWED_KEY, JSON.stringify([...reviewedSet]));
  } catch {
    // ignore
  }
}

/** 내가 이미 후기를 남긴 모임인지 (중복 작성 방지) */
export function hasReviewedMeetup(meetupPostId: string): boolean {
  return reviewedSet.has(meetupPostId);
}

function rowToReview(r: Record<string, unknown>): MeetupReview {
  return {
    id: String(r.id),
    meetupPostId: String(r.meetup_post_id ?? ""),
    hostNickname: String(r.host_nickname ?? ""),
    hostPhone: r.host_phone ? String(r.host_phone) : undefined,
    reviewerNickname: String(r.reviewer_nickname ?? "이웃"),
    reviewerPhone: r.reviewer_phone ? String(r.reviewer_phone) : undefined,
    rating: Number(r.rating ?? 0),
    comment: String(r.comment ?? ""),
    createdAt: r.created_at ? new Date(String(r.created_at)).getTime() : Date.now(),
  };
}

/** 방장 닉네임의 후기를 Supabase 에서 읽어온다. 실패/미존재 시 null. */
async function fetchReviews(hostNickname: string): Promise<MeetupReview[] | null> {
  try {
    const { data, error } = await supabase
      .from("meetup_reviews")
      .select("id, meetup_post_id, host_nickname, host_phone, reviewer_nickname, reviewer_phone, rating, comment, created_at")
      .eq("host_nickname", hostNickname)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !Array.isArray(data)) return null;
    return data.map((r) => rowToReview(r as Record<string, unknown>));
  } catch {
    return null;
  }
}

function aggregate(reviews: MeetupReview[]): HostRating {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/**
 * 모임 후기 작성.
 * - 낙관적으로 캐시에 먼저 반영 + 후기 남김 표시
 * - best-effort 로 Supabase insert (테이블 없으면 무시)
 * 반환: 성공 시 생성된 후기, 신원 없거나 중복이면 null.
 */
export async function addMeetupReview(input: {
  meetupPostId: string;
  hostNickname: string;
  hostPhone?: string;
  rating: number;
  comment: string;
}): Promise<MeetupReview | null> {
  if (hasReviewedMeetup(input.meetupPostId)) return null;
  const profile = getProfile();
  const reviewerPhone = getCurrentAccount() ?? undefined;
  const review: MeetupReview = {
    id: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    meetupPostId: input.meetupPostId,
    hostNickname: input.hostNickname,
    hostPhone: input.hostPhone,
    reviewerNickname: profile.nickname || "이웃",
    reviewerPhone,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.trim().slice(0, 60),
    createdAt: Date.now(),
  };

  cache = { ...cache, [input.hostNickname]: [review, ...(cache[input.hostNickname] ?? [])] };
  persistCache();
  reviewedSet = new Set(reviewedSet);
  reviewedSet.add(input.meetupPostId);
  persistReviewed();

  supabase
    .from("meetup_reviews")
    .insert({
      id: review.id,
      meetup_post_id: review.meetupPostId,
      host_nickname: review.hostNickname,
      host_phone: review.hostPhone ?? null,
      reviewer_nickname: review.reviewerNickname,
      reviewer_phone: review.reviewerPhone ?? null,
      rating: review.rating,
      comment: review.comment,
    })
    .then(({ error }) => {
      if (error) console.warn("모임 후기 저장 실패(로컬만 유지):", error.message);
    });

  return review;
}

/**
 * 방장 닉네임의 평균 별점·후기 수를 구독하는 훅.
 * - 캐시 즉시 반환 + Supabase 최신본으로 갱신(있을 때만).
 */
export function useHostRating(hostNickname: string | undefined): HostRating {
  const [rating, setRating] = useState<HostRating>(() =>
    hostNickname ? aggregate(cache[hostNickname] ?? []) : { avg: 0, count: 0 },
  );

  useEffect(() => {
    if (!hostNickname) {
      setRating({ avg: 0, count: 0 });
      return;
    }
    let cancelled = false;
    setRating(aggregate(cache[hostNickname] ?? []));
    fetchReviews(hostNickname).then((rows) => {
      if (cancelled || !rows) return;
      cache = { ...cache, [hostNickname]: rows };
      persistCache();
      setRating(aggregate(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [hostNickname]);

  return rating;
}

/** 컴포넌트에서 '이 모임에 후기를 남겼는지' 를 즉시 반영하기 위한 가벼운 훅(로컬 기준). */
export function useHasReviewed(meetupPostId: string): [boolean, () => void] {
  const [reviewed, setReviewed] = useState<boolean>(() => hasReviewedMeetup(meetupPostId));
  const refresh = useCallback(() => setReviewed(hasReviewedMeetup(meetupPostId)), [meetupPostId]);
  useEffect(() => {
    setReviewed(hasReviewedMeetup(meetupPostId));
  }, [meetupPostId]);
  return [reviewed, refresh];
}
