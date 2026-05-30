import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type Post, type PostLocation } from "@/shared/mock/data";
import { postsStore, computeTimeAgo } from "./posts-store";
import { StatusBadge } from "./board-list-screen";
import { LocationMap, LocationPicker } from "@/features/map/post-map";
import { getAvatarUrl } from "@/features/chat/avatars";
import { ME_PERSONA } from "@/features/home/home-faces";
import { useProfile } from "@/shared/hooks/use-profile";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import {
  calcJoined,
  ensureMeetupRoom,
  isMeetupPost,
  meetupRoomId,
} from "./meetup-utils";
import { leaveRoomById } from "@/features/chat/rooms-store";
import { togglePostLike, useLikedSet } from "@/shared/stores/likes-store";
import { joinPost, leavePost, useJoinedSet } from "@/shared/stores/joined-store";
import { markBlocked } from "@/shared/stores/blocked-nicknames-store";
import { addComment, useUserComments, type StoredComment } from "@/shared/stores/comments-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { uploadPhotoToStorage } from "@/shared/lib/storage-upload";
import { markPostViewed, hasViewedPost } from "@/shared/stores/viewed-posts-store";
import {
  getTotalViews,
  incrementViewCount,
  useViewCounts,
} from "@/shared/stores/view-count-store";
import { awardXp } from "@/shared/stores/xp-store";
import { pushMeetingJoined, pushMeetingFull } from "@/shared/stores/notifications-store";
import { tryDailyEarn } from "@/features/myroom/myroom-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import {
  BUMP_MAX_COUNT,
  bumpStore,
  formatBumpRemaining,
} from "@/shared/stores/bump-store";

type CommentReply = {
  id: string;
  nickname: string;
  content: string;
  timeAgo: string;
  isAuthor?: boolean;
  hasMap?: boolean;
  hasPhoto?: boolean;
  /** 사진 첨부 data URL */
  photoUrl?: string;
  /** 지도 첨부 좌표/장소명 */
  location?: { lat: number; lng: number; placeName?: string };
};

type CommentThread = {
  id: string;
  nickname: string;
  content: string;
  timeAgo: string;
  /** 부모 댓글도 사진 첨부 가능 — 댓글 입력창의 + 버튼에서 카메라/사진 선택 시 true. */
  hasPhoto?: boolean;
  /** 사진 첨부 data URL — 실제 카메라/갤러리에서 받은 이미지. */
  photoUrl?: string;
  /** 지도 첨부 여부 + 좌표 */
  hasMap?: boolean;
  location?: { lat: number; lng: number; placeName?: string };
  replies: CommentReply[];
};

// 자유 / 추천 게시판이라도 모임 메타데이터가 붙어 있으면 모임 레이아웃을 사용한다.
// 판정 규칙은 meetup-utils 의 isMeetupPost 와 동일 — 채팅방 생성 정책과 일치시킨다.

/**
 * "방금 전" / "10분 전" / "3시간 전" / "2일 전" / "1주 전" 같은 timeAgo 를
 * 현재 시각 기준으로 역산해 작성일 Date 로 변환.
 */
function parseTimeAgoToDate(timeAgo: string): Date {
  const now = new Date();
  if (!timeAgo || /방금/.test(timeAgo)) return now;
  const m = timeAgo.match(/(\d+)\s*(분|시간|일|주)/);
  if (!m) return now;
  const n = Number(m[1]);
  const out = new Date(now);
  switch (m[2]) {
    case "분":
      out.setMinutes(out.getMinutes() - n);
      break;
    case "시간":
      out.setHours(out.getHours() - n);
      break;
    case "일":
      out.setDate(out.getDate() - n);
      break;
    case "주":
      out.setDate(out.getDate() - n * 7);
      break;
  }
  return out;
}

/**
 * "YYYY-MM-DD" 형식의 event/end date 를 게시글 상세에서 쓰는 짧은 표기로 변환.
 *   "2026-05-18" → "26.05.18" (zero-padded yy.mm.dd, 앱 전반 통일)
 * 잘못된 형식이면 입력을 그대로 돌려준다 (mock 폴백 케이스 보호).
 */
function formatYmdShort(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return ymd;
  const yy = m[1].slice(2);
  const mm = String(Number(m[2])).padStart(2, "0");
  const dd = String(Number(m[3])).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

/** yy.mm.dd 형식 (게시글 작성일 노출용) — 앱 전반 통일된 날짜 포맷. */
function formatPostDate(timeAgo: string): string {
  const d = parseTimeAgoToDate(timeAgo);
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export function BoardDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [posts, setPosts] = useState<Post[]>(postsStore.getPosts());
  useEffect(() => {
    return postsStore.subscribe(() => setPosts(postsStore.getPosts()));
  }, []);
  const post = posts.find((p) => p.id === id) ?? posts[0];
  const profile = useProfile();

  // 장소 정보가 없으면 가짜 지명("미금역 사거리") 대신 중립 문구를 표시한다.
  const place = post.place ?? post.location?.placeName ?? "장소 미정";
  // "시간" 라인 표시
  //  - 장기성: 시작일 ~ 종료일 (시간 표시 없음)
  //  - 단기성: 단일 날짜 + 시작 시각 (HH:MM)
  //  - eventDate 가 없는 옛 mock 글은 종전 데모 문구로 폴백.
  const timeText = useMemo(() => {
    // 일정 정보가 없으면 가짜 날짜("26.04.02") 대신 중립 문구.
    if (!post.eventDate) return "일정 미정";
    const start = formatYmdShort(post.eventDate);
    const isLongTerm = post.meetupType === "장기성 모임";
    if (isLongTerm && post.endDate && post.endDate !== post.eventDate) {
      return `${start} ~ ${formatYmdShort(post.endDate)}`;
    }
    // 단기성 — 시간이 있으면 같이 노출 ("26.5.18  19:00")
    if (post.eventTime) {
      return `${start}  ${post.eventTime}`;
    }
    return start;
  }, [post.eventDate, post.endDate, post.eventTime, post.meetupType]);

  // 모임 종료 여부 — 일정(장기성=종료일 / 단기성=시작일)이 지났으면 true.
  // 그 날의 끝(23:59:59)까지는 유효로 본다. 일정 미정(eventDate 없음)은 종료 아님.
  const isExpired = useMemo(() => {
    if (!post.eventDate) return false;
    const isLongTerm = post.meetupType === "장기성 모임";
    const lastDateStr = isLongTerm ? (post.endDate ?? post.eventDate) : post.eventDate;
    const last = new Date(`${lastDateStr}T23:59:59`);
    if (Number.isNaN(last.getTime())) return false;
    return Date.now() > last.getTime();
  }, [post.eventDate, post.endDate, post.meetupType]);

  const { capacity, baseJoined } = calcJoined(post);

  // Interactive state — 좋아요는 likes-store 에서 영속화된 상태를 사용
  const likedSet = useLikedSet();
  const liked = likedSet.has(post.id);
  // 참여 상태는 joined-store 에서 읽는다 — localStorage 영속화 + 한 번 참여하면 풀리지 않음
  const joinedSet = useJoinedSet();
  const joining = joinedSet.has(post.id);
  const [commentText, setCommentText] = useState("");
  // 댓글 입력창의 사진 첨부 — + 버튼 팝업에서 카메라/사진 중 하나 고르면 켜진다.
  const [commentHasPhoto, setCommentHasPhoto] = useState(false);
  /** 실제 첨부 이미지의 data URL — 카메라/갤러리에서 받은 그대로 미리보기 + 저장에 사용. */
  const [commentPhotoUrl, setCommentPhotoUrl] = useState<string | null>(null);
  /** 댓글 입력창의 지도 첨부 — 위치 선택 모달에서 선택한 좌표. null 이면 첨부 없음. */
  const [commentLocation, setCommentLocation] = useState<PostLocation | null>(
    null,
  );
  const [showCommentAttach, setShowCommentAttach] = useState(false);
  /** + 팝업에서 "사진" 을 누르면 카메라/사진 첨부 서브메뉴로 전환된다. "root" → "photo". */
  const [commentAttachStep, setCommentAttachStep] = useState<"root" | "photo">(
    "root",
  );
  /** 위치 선택 모달 표시 여부 + 모달 내부 임시 좌표/장소명 — 글쓰기 화면과 동일한 패턴. */
  const [showCommentLocationPicker, setShowCommentLocationPicker] =
    useState(false);
  const [commentDraftPick, setCommentDraftPick] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [commentDraftPlaceName, setCommentDraftPlaceName] = useState("");
  // 두 개의 hidden 파일 input — 카메라는 capture 속성으로 모바일에서 후면 카메라가 바로 열리고,
  // 사진 첨부는 capture 없이 갤러리/파일 선택 다이얼로그가 열린다.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** 선택된 파일을 data URL 로 읽어 첨부 상태에 반영. 1MB 초과 시 안내만 — 데모 데이터 보호. */
  const handleCommentFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 첨부할 수 있어요");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("5MB 이하 이미지만 첨부할 수 있어요");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url) return;
      setCommentPhotoUrl(url);
      setCommentHasPhoto(true);
    };
    reader.readAsDataURL(file);
  };
  // Supabase에서 이 게시글의 실제 댓글 로드
  const [supabaseComments, setSupabaseComments] = useState<StoredComment[]>([]);
  // 댓글 로더를 재사용 가능한 함수로 분리 — 최초 mount + 새로고침에서 동일하게 호출.
  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setSupabaseComments(
      (data ?? []).map((row: any) => ({
        id: String(row.id),
        postId: row.post_id ?? post.id,
        nickname: row.nickname ?? "알 수 없음",
        content: row.content ?? "",
        timeAgo: computeTimeAgo(row.created_at),
        parentId: row.parent_id ?? undefined,
        hasPhoto: row.photo_url ? true : undefined,
        photoUrl: row.photo_url ?? undefined,
      })),
    );
  }, [post.id]);
  useEffect(() => {
    loadComments();
  }, [loadComments]);
  // 사용자가 작성한 댓글/대댓글은 store 에서 가져온다.
  const userComments = useUserComments();
  const comments = useMemo<CommentThread[]>(() => {
    /**
     * Supabase 댓글을 단일 소스로 사용.
     * localStorage(userComments)는 전송 직후 Supabase 반영 전 optimistic 용도로만 추가.
     *
     * 중복 방지 전략:
     * - Supabase ID set → localStorage에서 같은 UUID가 있으면 건너뜀
     * - nickname+content 조합 set → 내가 쓴 댓글이 Supabase에도 있으면 건너뜀
     *   (localStorage ID는 `c-timestamp`, Supabase ID는 UUID라 ID로는 매칭 불가)
     */
    const parentMap = new Map<string, CommentThread>();
    const parents: CommentThread[] = [];

    // 1) Supabase 부모 댓글 먼저 추가
    for (const c of supabaseComments) {
      if (!c.parentId) {
        const thread: CommentThread = {
          id: c.id,
          nickname: c.nickname,
          content: c.content,
          timeAgo: c.timeAgo,
          hasPhoto: c.hasPhoto,
          photoUrl: c.photoUrl,
          hasMap: c.hasMap,
          location: c.location,
          replies: [],
        };
        parents.push(thread);
        parentMap.set(c.id, thread);
      }
    }

    // 2) Supabase 대댓글을 부모 thread에 연결
    for (const c of supabaseComments) {
      if (!c.parentId) continue;
      const parent = parentMap.get(c.parentId);
      if (!parent) continue;
      parent.replies.push({
        id: c.id,
        nickname: c.nickname,
        content: c.content,
        timeAgo: c.timeAgo,
        isAuthor: c.nickname === post.authorNickname,
        hasMap: c.hasMap,
        hasPhoto: c.hasPhoto,
        photoUrl: c.photoUrl,
        location: c.location,
      });
    }

    // 3) localStorage 댓글 중 Supabase에 아직 없는 것만 optimistic으로 추가
    //    (전송 직후 Supabase 반영 전 짧은 순간)
    const supabaseIds = new Set(supabaseComments.map((c) => c.id));
    const supabaseKeys = new Set(
      supabaseComments.map((c) => `${c.nickname}:${c.content}`)
    );
    const myForThisPost = userComments.filter((c) => c.postId === post.id);

    for (const c of myForThisPost) {
      const key = `${c.nickname}:${c.content}`;
      if (supabaseIds.has(c.id) || supabaseKeys.has(key)) continue;
      if (!c.parentId) {
        const thread: CommentThread = {
          id: c.id,
          nickname: c.nickname,
          content: c.content,
          timeAgo: c.timeAgo,
          hasPhoto: c.hasPhoto,
          photoUrl: c.photoUrl,
          hasMap: c.hasMap,
          location: c.location,
          replies: [],
        };
        parents.push(thread);
        parentMap.set(c.id, thread);
      }
    }

    // 4) localStorage 대댓글도 optimistic 처리
    for (const c of myForThisPost) {
      if (!c.parentId) continue;
      const key = `${c.nickname}:${c.content}`;
      if (supabaseIds.has(c.id) || supabaseKeys.has(key)) continue;
      const parent = parentMap.get(c.parentId);
      if (!parent) continue;
      parent.replies.push({
        id: c.id,
        nickname: c.nickname,
        content: c.content,
        timeAgo: c.timeAgo,
        isAuthor: c.nickname === post.authorNickname,
        hasMap: c.hasMap,
        hasPhoto: c.hasPhoto,
        photoUrl: c.photoUrl,
        location: c.location,
      });
    }

    return parents;
  }, [userComments, supabaseComments, post.id]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyHasPhoto, setReplyHasPhoto] = useState(false);
  const [replyHasMap, setReplyHasMap] = useState(false);
  /** 대댓글도 실제 사진/지도 첨부 — 댓글 입력창과 동일한 카메라/갤러리/지도 흐름. */
  const [replyPhotoUrl, setReplyPhotoUrl] = useState<string | null>(null);
  const [replyLocation, setReplyLocation] = useState<PostLocation | null>(null);
  /** + 팝업 서브메뉴 상태. */
  const [replyAttachStep, setReplyAttachStep] = useState<"root" | "photo">(
    "root",
  );
  const [showReplyLocationPicker, setShowReplyLocationPicker] = useState(false);
  const [replyDraftPick, setReplyDraftPick] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [replyDraftPlaceName, setReplyDraftPlaceName] = useState("");
  /** 대댓글용 hidden 파일 input — 댓글 입력창과 동일한 패턴. */
  const replyCameraInputRef = useRef<HTMLInputElement>(null);
  const replyPhotoInputRef = useRef<HTMLInputElement>(null);
  /** 대댓글 사진 파일 처리 — 댓글과 동일한 검증/Read 흐름. */
  const handleReplyFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 첨부할 수 있어요");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("5MB 이하 이미지만 첨부할 수 있어요");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url) return;
      setReplyPhotoUrl(url);
      setReplyHasPhoto(true);
    };
    reader.readAsDataURL(file);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // 사진 풀스크린 뷰어 — 댓글/대댓글/게시글 첨부 사진 탭 시 크게 보기.
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [showFullAlert, setShowFullAlert] = useState(false);
  const [showJoinBanner, setShowJoinBanner] = useState(false);
  const [showNotJoinedAlert, setShowNotJoinedAlert] = useState(false);
  // "함께하기" 클릭 시 띄울 참여 확인 / 참여중 상태에서 다시 클릭 시 띄울 취소 확인
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 더보기(⋮) 메뉴 액션 — 신고/차단 확인 다이얼로그 + 새로고침/URL공유 토스트
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  /** 짧게 떴다 사라지는 안내 — chat-room 의 패턴 그대로. */
  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800);
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // 게시글 진입 시 "최근 본 글" 에 기록 (마이페이지 목록의 원천) + 조회수 +1.
  // 조회수는 "이 글을 처음 본 사용자" 에 한해 1회만 증가시킨다(hasViewedPost 가드).
  // → 재진입/새로고침마다 +1 되어 조회수가 부풀려지던 문제를 막는다.
  // viewedOnceRef 는 StrictMode 의 mount-unmount-mount 이중 실행만 방어.
  const viewedOnceRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!post?.id) return;
    if (viewedOnceRef.current.has(post.id)) return;
    viewedOnceRef.current.add(post.id);
    const firstView = !hasViewedPost(post.id);
    markPostViewed(post.id);
    if (firstView) incrementViewCount(post.id);
  }, [post?.id]);

  // 조회수 (baseline + 사용자 증분) — 증분이 변경되면 자동 재렌더
  useViewCounts();
  const views = getTotalViews(post);

  // Close dots menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // free / recommend 인데도 모임 정보가 붙어있으면 모임 게시글로 본다.
  // 자유 / 추천이면서 모임 메타데이터도 없는 글만 단순 레이아웃.
  const isSimple = !isMeetupPost(post);
  // post.likes 는 togglePostLike→patchLikes 로 이미 낙관적 +1/-1 반영된 값이므로
  // 여기서 또 +1 하면 안 된다(하트가 2씩 오르던 버그). store 값을 그대로 표시.
  const likes = post.likes;
  // baseJoined(=participants.length)는 joinPost→patchParticipants 로 이미 본인을 포함한다.
  // 따라서 joining 플래그로 다시 +1 하면 본인이 이중 계산돼 인원이 2씩 부풀려진다(혼자인데 2/5).
  const joined = Math.min(capacity, baseJoined);
  const displayStatus: "모집중" | "모집완료" =
    joined >= capacity ? "모집완료" : "모집중";
  // 실제 렌더링되는 댓글 + 대댓글 수 — post.comments(mock 카운트) 가 아니라
  // 화면에 보이는 항목과 일치시킨다.
  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0,
  );
  const hasCommentText = commentText.trim().length > 0;
  const hasReplyText = replyText.trim().length > 0;
  // "내 글" 여부는 현재 로그인 계정 닉네임(profile-store)과 비교한다.
  // 닉네임은 변경될 수 있으므로 전화번호로 "내 글" 여부 판별.
  // authorPhone 이 없는 구(舊) 게시글은 닉네임으로 fallback.
  const myPhone = getCurrentAccount();
  const isMine = myPhone
    ? (post.authorPhone ? post.authorPhone === myPhone : post.authorNickname === profile.nickname)
    : post.authorNickname === profile.nickname;

  const handleSendComment = async () => {
    // 사진/지도만 첨부하고 텍스트가 없어도 전송 가능 — 답글 입력과 동일한 정책.
    if (!hasCommentText && !commentHasPhoto && !commentLocation) return;
    // 사진이 base64라면 Storage에 업로드 후 공개 URL 사용 (fallback: base64 그대로)
    const resolvedPhotoUrl =
      commentPhotoUrl?.startsWith("data:")
        ? await uploadPhotoToStorage(commentPhotoUrl, "comments")
        : commentPhotoUrl ?? undefined;
    addComment({
      id: `c-${Date.now()}`,
      postId: post.id,
      nickname: profile.nickname,
      content: commentText.trim(),
      timeAgo: "방금 전",
      hasPhoto: commentHasPhoto || undefined,
      photoUrl: resolvedPhotoUrl,
      hasMap: commentLocation ? true : undefined,
      location: commentLocation ?? undefined,
    });
    awardXp("comment");
    // 댓글 작성 보상 — 하루 최대 10회(=10P) 까지 적립
    tryDailyEarn("comment", 10, 1, {
      title: "댓글 작성",
      note: post.title,
    });
    setCommentText("");
    setCommentHasPhoto(false);
    setCommentPhotoUrl(null);
    setCommentLocation(null);
    setShowCommentAttach(false);
    setCommentAttachStep("root");
  };

  /** 답글 입력창의 + 버튼 팝업 (사진/지도) 열림 여부. parentId 단위로는 한 번에 하나만 열리므로 boolean. */
  const [showReplyAttach, setShowReplyAttach] = useState(false);

  const handleSendReply = async (parentId: string) => {
    if (!hasReplyText && !replyHasPhoto && !replyHasMap) return;
    // 사진이 base64라면 Storage에 업로드 후 공개 URL 사용 (fallback: base64 그대로)
    const resolvedReplyPhotoUrl =
      replyPhotoUrl?.startsWith("data:")
        ? await uploadPhotoToStorage(replyPhotoUrl, "comments")
        : replyPhotoUrl ?? undefined;
    addComment({
      id: `r-${Date.now()}`,
      postId: post.id,
      parentId,
      nickname: profile.nickname,
      content: replyText.trim(),
      timeAgo: "방금 전",
      isAuthor: isMine,
      hasMap: replyHasMap,
      hasPhoto: replyHasPhoto,
      photoUrl: resolvedReplyPhotoUrl,
      location: replyLocation ?? undefined,
    });
    awardXp("comment");
    // 대댓글도 댓글로 카운트 — 같은 daily cap 공유
    tryDailyEarn("comment", 10, 1, {
      title: "댓글 작성",
      note: post.title,
    });
    // 작성 완료 후엔 입력창 자체를 접는다 — 사용자 요청.
    setReplyingTo(null);
    setReplyText("");
    setReplyHasPhoto(false);
    setReplyHasMap(false);
    setReplyPhotoUrl(null);
    setReplyLocation(null);
    setShowReplyAttach(false);
    setReplyAttachStep("root");
  };

  /** 댓글 입력창의 "지도" 선택 — 위치 선택 모달을 연다. 현재 첨부된 좌표가 있으면 그걸 기본값으로. */
  const openCommentLocationPicker = () => {
    setCommentDraftPick(
      commentLocation
        ? { lat: commentLocation.lat, lng: commentLocation.lng }
        : null,
    );
    setCommentDraftPlaceName(commentLocation?.placeName ?? "");
    setShowCommentAttach(false);
    setCommentAttachStep("root");
    setShowCommentLocationPicker(true);
  };
  const confirmCommentLocationPicker = () => {
    if (commentDraftPick) {
      setCommentLocation({
        lat: commentDraftPick.lat,
        lng: commentDraftPick.lng,
        placeName: commentDraftPlaceName.trim() || undefined,
      });
    } else {
      setCommentLocation(null);
    }
    setShowCommentLocationPicker(false);
  };

  /** 대댓글 입력창의 "지도" 선택 — 댓글과 동일한 패턴. */
  const openReplyLocationPicker = () => {
    setReplyDraftPick(
      replyLocation ? { lat: replyLocation.lat, lng: replyLocation.lng } : null,
    );
    setReplyDraftPlaceName(replyLocation?.placeName ?? "");
    setShowReplyAttach(false);
    setReplyAttachStep("root");
    setShowReplyLocationPicker(true);
  };
  const confirmReplyLocationPicker = () => {
    if (replyDraftPick) {
      setReplyLocation({
        lat: replyDraftPick.lat,
        lng: replyDraftPick.lng,
        placeName: replyDraftPlaceName.trim() || undefined,
      });
      setReplyHasMap(true);
    } else {
      setReplyLocation(null);
      setReplyHasMap(false);
    }
    setShowReplyLocationPicker(false);
  };

  const handleJoinClick = () => {
    // 이미 참여 중이면 한 번 더 눌렀을 때 취소 확인 다이얼로그 — 채팅방까지 같이 퇴장됨을 빨간 글씨로 안내.
    if (joining) {
      setShowLeaveConfirm(true);
      return;
    }
    // 날짜가 지난(종료된) 모임은 신규 참여 불가. (버튼도 '모임 종료'로 비활성화되지만 안전 가드)
    if (isExpired) return;
    // 모집 정원이 다 찼으면 안내
    if (baseJoined >= capacity) {
      setShowFullAlert(true);
      return;
    }
    // 신규 참여는 참여 확인 다이얼로그 — 현재 인원 표시.
    setShowJoinConfirm(true);
  };

  /** 참여 확인 다이얼로그에서 "참여" 를 눌렀을 때 실제로 모임에 참여한다. */
  const confirmJoin = () => {
    setShowJoinConfirm(false);
    joinPost(post.id);
    ensureMeetupRoom(post);
    awardXp("join");
    // 모임 참여 알림 — 알림 패널에서 그 모임으로 바로 이동할 수 있도록 한 줄 발행.
    pushMeetingJoined(post.title, post.id);
    setShowJoinBanner(true);
    // 이번 참여로 정원이 채워지고 + 이 모임을 내가 주최한 경우 → 호스트(=현재 사용자)에게 모집 완료 알림.
    // baseJoined + 1(이번 참여) >= capacity 이면 정원 채움.
    const willBeFull = Math.min(capacity, baseJoined + 1) >= capacity;
    if (willBeFull && isMine) {
      pushMeetingFull(post.title, post.id);
    }
  };

  /** 취소 확인 다이얼로그에서 "취소" 를 눌렀을 때 실제로 모임에서 빠지고 채팅방도 퇴장. */
  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    leavePost(post.id);
    // 모임 참여로 만들어진 채팅방 id 는 `meetup-<postId>` — 메시지까지 함께 정리.
    leaveRoomById(meetupRoomId(post.id));
    // 참여 상태가 풀렸으므로 "모임이 만들어졌어요!" 배너도 닫는다.
    setShowJoinBanner(false);
  };

  const handleEdit = () => {
    navigate("/board/write", {
      state: {
        postId: post.id,
        postCategory: post.category,
        title: post.title,
        content: post.description,
        meetupType: post.meetupType,
        eventDate: post.eventDate,
        // 장기성 모임의 종료일도 함께 넘겨야 수정 진입 시 종료일이 복원된다.
        endDate: post.endDate,
        // 단기성 모임의 시작 시각도 함께 — 수정 진입 시 셀렉트가 그 값으로 복원되도록.
        eventTime: post.eventTime,
        peopleCount: post.peopleCount,
        place: post.place ?? place,
        postLocation: post.location ?? null,
        // 첨부 사진도 함께 넘겨야 수정 진입 시 그대로 복원되고, 작성자가 추가/삭제 후 다시 저장할 수 있다.
        photoUrls: post.photoUrls,
      },
    });
  };

  const handleDelete = () => {
    postsStore.remove([post.id]);
    navigate("/board/list");
  };

  /**
   * 끌어올리기 — 본인 글을 게시판 최상단으로 이동.
   *  - 쿨다운 중이면 토스트로 남은 시간 안내
   *  - 가능하면 글의 timeAgo 를 "방금 전" 으로 갱신 → postsStore.update 가 시간순 재정렬
   *  - 성공 시 게시판 리스트로 이동해 결과(최상단 노출) 를 즉시 확인 가능
   */
  const handleBump = () => {
    if (!post) return;
    // 한도 도달 — 더 이상 끌어올릴 수 없음을 명확히 안내.
    if (bumpStore.isMaxedOut(post.id)) {
      showToast(`끌어올리기는 글당 최대 ${BUMP_MAX_COUNT}회까지 가능해요`);
      return;
    }
    // 쿨다운 중 — 남은 시간 안내.
    if (!bumpStore.canBump(post.id)) {
      const remaining = bumpStore.getRemainingMs(post.id);
      showToast(`${formatBumpRemaining(remaining)} 후에 끌어올릴 수 있어요`);
      return;
    }
    bumpStore.bump(post.id);
    // update() 는 stable sort 때문에 동률 글들 사이에서 위치가 안 바뀐다.
    // bumpToTop() 은 명시적으로 글을 배열에서 제거 후 최상단에 prepend 한다.
    postsStore.bumpToTop(post);
    // 게시판 리스트로 이동 — 사용자가 끌어올림이 반영된 최상단 글을 바로 확인할 수 있도록
    navigate("/board/list");
  };

  /**
   * 새로고침 — 게시글 store 상태를 최신으로 다시 가져오고, 진입 시 한 번만 카운트하던
   * 조회수 가드(viewedOnceRef) 를 비워 이번 새로고침에서도 조회수 +1 이 한 번 더 반영되도록 한다.
   * 사용자에겐 짧은 토스트로 동작 완료를 알린다.
   */
  const handleRefresh = async () => {
    // 기존엔 메모리 캐시만 다시 읽어서 실제로는 아무것도 갱신되지 않았다.
    // Supabase 에서 글 목록과 이 글의 댓글을 실제로 다시 가져온다.
    // (새로고침은 조회수를 다시 올리지 않는다 — 조회수 부풀려짐 방지)
    await Promise.allSettled([postsStore.refresh(), loadComments()]);
    setPosts(postsStore.getPosts());
    showToast("새로고침 됐어요");
  };

  /** 신고 — 확인 다이얼로그 띄우기. 실제 신고 처리는 mock 이라 confirm 시 토스트로만 안내. */
  const handleReport = () => setShowReportConfirm(true);

  /** 차단 — 확인 다이얼로그 띄우기. confirm 시 차단 토스트 + 목록으로 복귀. */
  const handleBlock = () => setShowBlockConfirm(true);

  /**
   * URL 공유 — 현재 게시글 상세 URL 을 클립보드에 복사. navigator.clipboard 가
   * 없거나(구형 브라우저 / http) 권한이 거절되면 textarea + execCommand 폴백.
   */
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("링크가 복사되었어요");
    } catch {
      showToast("복사에 실패했어요");
    }
  };

  // 끌어올리기는 "모집" 성격의 게시판에서만 노출. 자유게시판/추천해요는 모집 글이 아니라
  // 시간 순 정보 공유 성격이라 끌어올리기를 숨긴다.
  const bumpAllowed = post.category !== "free" && post.category !== "recommend";
  const menuItems = isMine
    ? [
        ...(bumpAllowed
          ? [{ key: "bump", label: "끌어올리기", Icon: BumpIcon, onClick: handleBump }]
          : []),
        { key: "edit", label: "수정하기", Icon: EditIcon, onClick: handleEdit },
        { key: "delete", label: "삭제하기", Icon: TrashIcon, onClick: handleDelete },
      ]
    : [
        { key: "refresh", label: "새로고침", Icon: RefreshIcon, onClick: handleRefresh },
        { key: "report", label: "신고", Icon: ReportIcon, onClick: handleReport },
        { key: "block", label: "차단", Icon: BlockIcon, onClick: handleBlock },
        { key: "share", label: "URL 공유", Icon: ShareIcon, onClick: handleShare },
      ];

  return (
    <main className="flex flex-1 flex-col pb-6">
      {showJoinBanner && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-[14px] bg-white px-3 py-2 shadow-holo-card">
          <span className="text-[20px]" aria-hidden>🎉</span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-holo-ink">
              모임이 만들어졌어요!
            </p>
            <p className="truncate text-[11px] text-holo-ink-3">
              '{post.title}' 채팅방으로 초대합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              // 배너가 어떻게든 남아있더라도 실제 참여 상태가 아니면 진입 차단
              if (!joining) {
                setShowNotJoinedAlert(true);
                return;
              }
              const roomId = ensureMeetupRoom(post);
              // 자유/추천 단순 게시글은 모임 채팅방을 만들지 않는다 — null 이면 진입 차단.
              if (!roomId) return;
              navigate(`/chat/${roomId}`);
            }}
            className="shrink-0 rounded-full border border-holo-purple-mid px-3 py-1 text-[11px] font-medium text-holo-purple-mid"
          >
            채팅방으로 이동
          </button>
          <button
            type="button"
            aria-label="배너 닫기"
            onClick={() => setShowJoinBanner(false)}
            className="text-holo-ink-3"
          >
            <XIcon />
          </button>
        </div>
      )}
      <article className="mx-4 mt-2 flex flex-1 flex-col rounded-holo-card border border-holo-lilac-soft bg-white p-4">
        {/* Author row */}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          {/* 아바타 + Lv + 닉네임 영역 — 본인이 아니면 클릭 시 상대 프로필로 이동 */}
          <button
            type="button"
            disabled={isMine}
            onClick={() => {
              if (isMine) return;
              navigate(`/profile/${encodeURIComponent(post.authorNickname)}`);
            }}
            aria-label={isMine ? undefined : `${post.authorNickname} 프로필 보기`}
            className="flex items-center gap-2 disabled:cursor-default"
          >
            <img
              src={
                isMine
                  ? (profile.profileFace ?? ME_PERSONA.face)
                  : getAvatarUrl(post.authorNickname)
              }
              alt={post.authorNickname}
              className="ml-1 h-9 w-9 shrink-0 rounded-full bg-holo-yellow-room object-cover"
              draggable={false}
            />
            <span className="rounded-[4px] bg-holo-gradient px-2 py-0.5 text-[11px] font-semibold text-white">
              Lv.{post.authorLevel}
            </span>
            <span className="text-[14px] font-semibold text-holo-ink">
              {post.authorNickname}
            </span>
          </button>

          <div ref={menuRef} className="relative z-[1000] ml-auto">
            <button
              type="button"
              aria-label="더보기"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((p) => !p)}
              className="text-holo-ink-3"
            >
              <DotsIcon />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-[1001] mt-1 w-[150px] overflow-hidden rounded-[12px] border border-holo-lilac-soft bg-white shadow-holo-card">
                {menuItems.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink ${
                      i > 0 ? "border-t border-holo-line" : ""
                    }`}
                  >
                    <item.Icon />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-holo-surface-3" />

        {/* Meta row — 작성일 · 상대시간(좌) / 조회수(우 정렬) */}
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-holo-ink-3">
          <span>{formatPostDate(post.timeAgo)}</span>
          <span className="text-holo-line-2" aria-hidden>
            ·
          </span>
          <span>{post.timeAgo}</span>
          <span className="ml-auto" aria-label={`조회 ${views}`}>
            조회 {views.toLocaleString()}
          </span>
        </div>

        {/* Title row */}
        <div className="mt-2 flex items-center gap-2">
          {!isSimple && <StatusBadge status={displayStatus} />}
          <span className="text-[16px] font-semibold text-holo-ink">
            {post.title}
          </span>
        </div>

        {/* Meetup-only blocks: place/time, description, map, stats */}
        {!isSimple && (
          <>
            <div className="mt-2 flex gap-4 text-[13px]">
              <div className="flex flex-col gap-[3px] font-semibold text-holo-ink">
                <span>장소</span>
                <span>시간</span>
              </div>
              <div className="flex flex-col gap-[3px] text-holo-ink-2">
                <span>{place}</span>
                <span>{timeText}</span>
              </div>
            </div>

            {/* 게시글 본문 — 화면에서 가장 강조되어야 하는 텍스트. 댓글보다 크고 진하게. */}
            <p className="mt-[15px] text-[15px] leading-relaxed text-holo-ink">
              {post.description}
            </p>

            {/* 첨부 사진 — 글쓰기에서 추가한 이미지를 가로로 정렬해 노출. 0장이면 숨김. */}
            {post.photoUrls && post.photoUrls.length > 0 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {post.photoUrls.map((url, i) => (
                  <img
                    key={`${i}-${url.slice(-12)}`}
                    src={url}
                    alt={`첨부 사진 ${i + 1}`}
                    onClick={() => setFullImage(url)}
                    className="h-[140px] w-[140px] shrink-0 cursor-pointer rounded-[10px] border border-holo-line-2 object-cover"
                  />
                ))}
              </div>
            )}

            {/* 자유게시판/추천해요 외 카테고리는 항상 실제 지도를 표시한다.
                위치 데이터가 없는 경우엔 동네 기본 좌표(미금역 인근)로 폴백한다. */}
            <div className="mt-3 overflow-hidden rounded-[10px] border border-holo-line-2">
              <LocationMap
                location={
                  post.location ?? {
                    lat: 37.3504,
                    lng: 127.1094,
                    placeName: place,
                  }
                }
                className="h-[180px]"
              />
            </div>

            <div className="mt-3 flex items-center gap-[15px] text-holo-ink-2">
              <button
                type="button"
                aria-label={liked ? "좋아요 취소" : "좋아요"}
                aria-pressed={liked}
                onClick={() => togglePostLike(post.id)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={liked} />
                <span className="text-[14px] font-medium">{likes}</span>
              </button>
              <span className="flex items-center gap-1">
                <CommentIcon />
                <span className="text-[14px] font-medium">{totalComments}</span>
              </span>
              <span className="flex items-center gap-1">
                <ParticipantIcon />
                <span className="text-[14px] font-medium">
                  {joined}/{capacity}
                </span>
              </span>
              {isMine ? (
                // 내가 작성한 모임은 호스트이므로 "함께하기" 버튼 대신 호스트 표시.
                <span
                  className="ml-auto flex items-center gap-1 rounded-full border border-[#7448DD] bg-[#F4EEFF] px-4 py-1 text-[14px] font-semibold text-[#7448DD]"
                  aria-label="내가 만든 모임 (호스트)"
                >
                  <CheckMark color="#7448DD" />
                  내 모임
                </span>
              ) : isExpired && !joining ? (
                // 날짜가 지난 모임 — '모임 종료'로 비활성화(신규 참여 불가).
                <span
                  className="ml-auto flex items-center gap-1 rounded-full border border-holo-line-2 bg-holo-surface-2 px-4 py-1 text-[14px] font-semibold text-holo-ink-4"
                  aria-label="종료된 모임"
                >
                  모임 종료
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={joining ? "함께하기 취소" : "함께하기"}
                  aria-pressed={joining}
                  onClick={handleJoinClick}
                  className={`ml-auto flex items-center gap-1 rounded-full border px-4 py-1 text-[14px] font-semibold transition-colors ${
                    joining
                      ? "border-[#7448DD] text-[#7448DD]"
                      : "border-holo-line-2 text-holo-ink-2"
                  }`}
                >
                  <CheckMark color={joining ? "#7448DD" : "#A8A8A8"} />
                  {joining ? "모임 참여중" : "함께하기"}
                </button>
              )}
            </div>
          </>
        )}

        {/* Simple-only: description + heart/comment stats row */}
        {isSimple && (
          <>
            {/* 게시글 본문 — 댓글보다 크고 진하게, 최우선 가독성. */}
            <p className="mt-2 text-[15px] leading-relaxed text-holo-ink">{post.description}</p>
            {/* 자유/추천 카테고리에도 동일하게 사진 노출 */}
            {post.photoUrls && post.photoUrls.length > 0 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {post.photoUrls.map((url, i) => (
                  <img
                    key={`${i}-${url.slice(-12)}`}
                    src={url}
                    alt={`첨부 사진 ${i + 1}`}
                    onClick={() => setFullImage(url)}
                    className="h-[140px] w-[140px] shrink-0 cursor-pointer rounded-[10px] border border-holo-line-2 object-cover"
                  />
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center gap-[15px] text-holo-ink-2">
              <button
                type="button"
                aria-label={liked ? "좋아요 취소" : "좋아요"}
                aria-pressed={liked}
                onClick={() => togglePostLike(post.id)}
                className="flex items-center gap-1"
              >
                <HeartIcon filled={liked} />
                <span className="text-[14px] font-medium">{likes}</span>
              </button>
              <span className="flex items-center gap-1">
                <CommentIcon />
                <span className="text-[14px] font-medium">{totalComments}</span>
              </span>
            </div>
          </>
        )}

        {/* Comments — every comment is wrapped with 20px top/bottom padding and a bottom divider line.
            simple 카테고리(자유/추천)는 stats row 와 댓글 사이 간격을 16px 로 좁힌다. */}
        <div
          className={`${
            isSimple ? "mt-4" : "mt-3"
          } h-px w-full bg-holo-surface-3`}
        />

        <ul>
          {comments.map((c) => {
            const isReplying = replyingTo === c.id;
            return (
              <Fragment key={c.id}>
                <li>
                  <div className="w-full py-3 text-left">
                    <div className="flex items-center justify-between">
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.nickname === profile.nickname) return;
                          navigate(`/profile/${encodeURIComponent(c.nickname)}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            if (c.nickname === profile.nickname) return;
                            navigate(`/profile/${encodeURIComponent(c.nickname)}`);
                          }
                        }}
                        className="text-[13px] font-semibold text-holo-ink hover:underline"
                      >
                        {c.nickname}
                      </span>
                      <span className="text-[11px] text-holo-ink-3">
                        {c.timeAgo}
                      </span>
                    </div>
                    {/* 댓글 본문 — 게시글 본문(15px)보다 한 단계 작게(13px) 유지해
                        본문 > 댓글 위계가 시각적으로 드러나도록 함. */}
                    <p className="mt-1.5 text-[13px] leading-relaxed text-holo-ink">
                      {c.content}
                    </p>
                    {/* 부모 댓글 사진 첨부 미리보기 — photoUrl 이 있으면 실제 이미지, 없으면 회색 박스 폴백. */}
                    {c.hasPhoto && (
                      <div className="mt-2 h-[110px] w-full max-w-[200px] overflow-hidden rounded-[10px] bg-holo-line-3">
                        {c.photoUrl && (
                          <img
                            src={c.photoUrl}
                            alt="댓글 첨부 사진"
                            onClick={() => setFullImage(c.photoUrl!)}
                            className="h-full w-full cursor-pointer object-cover"
                          />
                        )}
                      </div>
                    )}
                    {/* 부모 댓글 지도 첨부 미리보기 */}
                    {c.hasMap && c.location && (
                      <div className="mt-2 h-[110px] w-full max-w-[200px] overflow-hidden rounded-[10px] border border-holo-line-2 [isolation:isolate]">
                        <LocationMap location={c.location} preview />
                      </div>
                    )}
                    {/* 대댓글 달기 — 댓글 본문 클릭이 아니라 명시적 버튼으로 답글 입력창을 토글.
                        (이전엔 댓글 영역 전체가 버튼이라 본문을 누르면 입력창이 열렸음) */}
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo((prev) => (prev === c.id ? null : c.id));
                        setReplyText("");
                        setReplyHasPhoto(false);
                        setReplyHasMap(false);
                        setReplyPhotoUrl(null);
                        setReplyLocation(null);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-holo-ink-3 transition-colors hover:text-holo-purple-mid"
                    >
                      {isReplying ? "취소" : "답글 달기"}
                    </button>
                  </div>

                  {/* Replies — indented with arrow + vertical line */}
                  {c.replies.map((r) => (
                    <div key={r.id} className="border-l-2 border-holo-lilac-soft pl-3 pb-3 ml-2">
                      <div className="flex items-start gap-1">
                        <ReplyArrowIcon />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (r.nickname === profile.nickname) return;
                                navigate(`/profile/${encodeURIComponent(r.nickname)}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  if (r.nickname === profile.nickname) return;
                                  navigate(`/profile/${encodeURIComponent(r.nickname)}`);
                                }
                              }}
                              className="text-[13px] font-semibold text-holo-ink hover:underline"
                            >
                              {r.nickname}
                            </span>
                            {r.isAuthor && (
                              <span className="rounded-[4px] border border-holo-purple-mid px-1.5 py-0.5 text-[10px] font-medium text-holo-purple-mid">
                                작성자
                              </span>
                            )}
                            <span className="ml-auto text-[11px] text-holo-ink-3">
                              {r.timeAgo}
                            </span>
                          </div>
                          {/* 대댓글 본문 — 댓글과 동일한 13px 로 위계 일관성 유지. */}
                          <p className="mt-1.5 text-[13px] leading-relaxed text-holo-ink">
                            {r.content}
                          </p>
                          {(r.hasPhoto || r.hasMap) && (
                            <div className="mt-2 flex flex-col gap-2">
                              {r.hasPhoto && (
                                <div className="h-[110px] w-full max-w-[200px] overflow-hidden rounded-[10px] bg-holo-line-3">
                                  {r.photoUrl && (
                                    <img
                                      src={r.photoUrl}
                                      alt="대댓글 첨부 사진"
                                      onClick={() => setFullImage(r.photoUrl!)}
                                      className="h-full w-full cursor-pointer object-cover"
                                    />
                                  )}
                                </div>
                              )}
                              {r.hasMap && r.location && (
                                <div className="h-[110px] w-full max-w-[200px] overflow-hidden rounded-[10px] border border-holo-line-2 [isolation:isolate]">
                                  <LocationMap location={r.location} preview />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Inline reply input — 메인 댓글 입력창과 동일한 패턴.
                      좌측에 + 버튼 → 팝업으로 사진/지도 옵션을 토글한다.
                      이전엔 입력창 아래에 사진/지도 토글이 별도로 노출되어 있었고, 사용자가 보내고 나서도
                      입력창이 계속 열려 있었다. 이제 전송하면 입력창 자체가 닫힌다. */}
                  {isReplying && (
                    <div className="ml-2 border-l-2 border-holo-lilac-soft pl-3 pb-3">
                      {/* 대댓글용 hidden 파일 input — 댓글 입력창과 동일 패턴. */}
                      <input
                        ref={replyCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          handleReplyFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <input
                        ref={replyPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleReplyFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        {/* 첨부 미리보기 — 사진/지도 토글이 켜져 있으면 입력창 위에 노출 */}
                        {(replyHasPhoto || replyHasMap) && (
                          <div className="flex flex-col gap-2">
                            {replyHasPhoto && (
                              <div className="relative h-[110px] w-[160px] overflow-hidden rounded-[10px] bg-holo-line-3">
                                {replyPhotoUrl && (
                                  <img
                                    src={replyPhotoUrl}
                                    alt="첨부 사진 미리보기"
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                <button
                                  type="button"
                                  aria-label="첨부 사진 제거"
                                  onClick={() => {
                                    setReplyHasPhoto(false);
                                    setReplyPhotoUrl(null);
                                  }}
                                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                                >
                                  <XIcon />
                                </button>
                              </div>
                            )}
                            {replyHasMap && replyLocation && (
                              <div className="relative h-[110px] w-[160px] overflow-hidden rounded-[10px] border border-holo-line-2 [isolation:isolate]">
                                <LocationMap location={replyLocation} preview />
                                <button
                                  type="button"
                                  aria-label="첨부 지도 제거"
                                  onClick={() => {
                                    setReplyHasMap(false);
                                    setReplyLocation(null);
                                  }}
                                  className="absolute right-1 top-1 z-[500] flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                                >
                                  <XIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {/* + 버튼 — 사진/지도 → 사진 선택 시 카메라/사진 첨부 서브메뉴로 전환. */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              aria-label="첨부 메뉴 열기"
                              onClick={() => {
                                setShowReplyAttach((p) => !p);
                                setReplyAttachStep("root");
                              }}
                              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                showReplyAttach || replyHasPhoto || replyHasMap
                                  ? "bg-holo-purple-mid text-white"
                                  : "bg-holo-surface-2 text-holo-ink-2"
                              }`}
                            >
                              <PlusIcon />
                            </button>
                            {showReplyAttach && replyAttachStep === "root" && (
                              <div className="absolute bottom-full left-0 z-20 mb-2 w-[140px] overflow-hidden rounded-[12px] border border-holo-line bg-white shadow-holo-card">
                                <button
                                  type="button"
                                  onClick={() => setReplyAttachStep("photo")}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                                >
                                  <PhotoIcon />
                                  사진
                                </button>
                                <div className="h-px bg-holo-line" />
                                <button
                                  type="button"
                                  onClick={openReplyLocationPicker}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                                >
                                  <PinIcon />
                                  지도
                                </button>
                              </div>
                            )}
                            {showReplyAttach && replyAttachStep === "photo" && (
                              <div className="absolute bottom-full left-0 z-20 mb-2 w-[140px] overflow-hidden rounded-[12px] border border-holo-line bg-white shadow-holo-card">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowReplyAttach(false);
                                    setReplyAttachStep("root");
                                    replyCameraInputRef.current?.click();
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                                >
                                  <CameraIcon />
                                  카메라
                                </button>
                                <div className="h-px bg-holo-line" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowReplyAttach(false);
                                    setReplyAttachStep("root");
                                    replyPhotoInputRef.current?.click();
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                                >
                                  <PhotoIcon />
                                  사진 첨부
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="relative flex-1">
                            <input
                              autoFocus
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="답글 작성하기"
                              className="h-[40px] w-full rounded-full bg-holo-surface-2 px-4 pr-12 text-[13px] outline-none placeholder:text-holo-ink-3"
                            />
                            <button
                              type="button"
                              aria-label="답글 전송"
                              disabled={!hasReplyText && !replyHasPhoto && !replyHasMap}
                              onClick={() => handleSendReply(c.id)}
                              className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                                hasReplyText || replyHasPhoto || replyHasMap
                                  ? "bg-[#7448DD] text-white"
                                  : "bg-holo-line-3 text-holo-ink-2"
                              }`}
                            >
                              <SendIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
                <div className="h-px w-full bg-holo-surface-3" />
              </Fragment>
            );
          })}
        </ul>

        {/* Main comment input — 좌측 + 버튼(카메라/사진 첨부 팝업) 포함 */}
        <form
          className="relative mt-auto pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendComment();
          }}
        >
          {/* 사진/지도 첨부 미리보기 — 둘 다 켤 수 있고, 입력창 위에 세로로 노출. */}
          {(commentHasPhoto || commentLocation) && (
            <div className="mb-2 flex flex-col gap-2">
              {commentHasPhoto && (
                <div className="relative h-[110px] w-[160px] overflow-hidden rounded-[10px] bg-holo-line-3">
                  {commentPhotoUrl && (
                    <img
                      src={commentPhotoUrl}
                      alt="첨부 사진 미리보기"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    aria-label="첨부 사진 제거"
                    onClick={() => {
                      setCommentHasPhoto(false);
                      setCommentPhotoUrl(null);
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <XIcon />
                  </button>
                </div>
              )}
              {commentLocation && (
                <div className="relative h-[110px] w-[160px] overflow-hidden rounded-[10px] border border-holo-line-2 [isolation:isolate]">
                  <LocationMap location={commentLocation} preview />
                  <button
                    type="button"
                    aria-label="첨부 지도 제거"
                    onClick={() => setCommentLocation(null)}
                    className="absolute right-1 top-1 z-[500] flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <XIcon />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* 카메라 / 갤러리 hidden file inputs — 메뉴 버튼이 ref 로 클릭만 트리거한다. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleCommentFile(e.target.files?.[0]);
              // 같은 파일을 다시 선택해도 onChange 가 다시 동작하도록 value 비움.
              e.target.value = "";
            }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleCommentFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="relative flex items-center gap-2">
            {/* + 버튼 — 사진/지도 → 사진 선택 시 카메라/사진 첨부 서브메뉴로 전환. */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="첨부 메뉴 열기"
                onClick={() => {
                  setShowCommentAttach((p) => !p);
                  setCommentAttachStep("root");
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  showCommentAttach || commentHasPhoto || commentLocation
                    ? "bg-holo-purple-mid text-white"
                    : "bg-holo-surface-2 text-holo-ink-2"
                }`}
              >
                <PlusIcon />
              </button>
              {showCommentAttach && commentAttachStep === "root" && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-[140px] overflow-hidden rounded-[12px] border border-holo-line bg-white shadow-holo-card">
                  <button
                    type="button"
                    onClick={() => setCommentAttachStep("photo")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                  >
                    <PhotoIcon />
                    사진
                  </button>
                  <div className="h-px bg-holo-line" />
                  <button
                    type="button"
                    onClick={openCommentLocationPicker}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                  >
                    <PinIcon />
                    지도
                  </button>
                </div>
              )}
              {showCommentAttach && commentAttachStep === "photo" && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-[140px] overflow-hidden rounded-[12px] border border-holo-line bg-white shadow-holo-card">
                  <button
                    type="button"
                    onClick={() => {
                      // 카메라 input 트리거 — 모바일에선 capture="environment" 로 후면 카메라가 바로 열린다.
                      setShowCommentAttach(false);
                      setCommentAttachStep("root");
                      cameraInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                  >
                    <CameraIcon />
                    카메라
                  </button>
                  <div className="h-px bg-holo-line" />
                  <button
                    type="button"
                    onClick={() => {
                      // 사진 input 트리거 — 갤러리/파일 선택 다이얼로그 열림.
                      setShowCommentAttach(false);
                      setCommentAttachStep("root");
                      photoInputRef.current?.click();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-holo-ink hover:bg-holo-surface-2"
                  >
                    <PhotoIcon />
                    사진 첨부
                  </button>
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                type="text"
                placeholder="댓글을 작성하기"
                className="h-[40px] w-full rounded-full bg-holo-surface-2 px-4 pr-12 text-[13px] outline-none placeholder:text-holo-ink-3"
              />
              <button
                type="submit"
                aria-label="전송"
                // 사진/지도만 첨부해도 전송 가능 — 셋 중 하나라도 있으면 활성화.
                disabled={!hasCommentText && !commentHasPhoto && !commentLocation}
                className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                  hasCommentText || commentHasPhoto || commentLocation
                    ? "bg-[#7448DD] text-white"
                    : "bg-holo-line-3 text-holo-ink-2"
                }`}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </form>
      </article>

      {/* 댓글 입력창 — 지도 첨부용 위치 선택 모달. 글쓰기 화면과 동일한 패턴. */}
      {showCommentLocationPicker && (
        <div
          className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40"
          onClick={() => setShowCommentLocationPicker(false)}
        >
          <div
            className="mt-auto flex h-[85%] flex-col overflow-hidden rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
              <button
                type="button"
                onClick={() => setShowCommentLocationPicker(false)}
                className="text-[14px] text-holo-ink-2"
              >
                취소
              </button>
              <span className="text-[14px] font-semibold text-holo-ink">
                위치 선택
              </span>
              <button
                type="button"
                onClick={confirmCommentLocationPicker}
                disabled={!commentDraftPick}
                className="text-[14px] font-semibold text-holo-purple-mid disabled:opacity-40"
              >
                확인
              </button>
            </div>
            <div className="relative flex-1">
              <LocationPicker
                value={commentDraftPick}
                onChange={setCommentDraftPick}
                onPlaceName={(name) => {
                  setCommentDraftPlaceName((prev) => (prev.trim() ? prev : name));
                }}
              />
              <p className="pointer-events-none absolute left-1/2 top-14 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-holo-ink-2 shadow">
                지도를 탭해 위치를 선택하세요
              </p>
            </div>
            <div className="shrink-0 border-t border-holo-line px-4 py-3">
              <label
                className="text-[12px] text-holo-ink-3"
                htmlFor="comment-place-name"
              >
                장소 이름 (선택)
              </label>
              <input
                id="comment-place-name"
                type="text"
                value={commentDraftPlaceName}
                onChange={(e) => setCommentDraftPlaceName(e.target.value)}
                placeholder="예: 미금역 1번 출구"
                className="mt-1 w-full border-b border-holo-line py-2 text-[14px] outline-none placeholder:text-holo-ink-3"
              />
            </div>
          </div>
        </div>
      )}

      {/* 대댓글 입력창 — 지도 첨부용 위치 선택 모달. 댓글과 동일. */}
      {showReplyLocationPicker && (
        <div
          className="fixed left-1/2 top-0 z-[1100] flex h-[100dvh] w-full max-w-[360px] -translate-x-1/2 flex-col bg-black/40"
          onClick={() => setShowReplyLocationPicker(false)}
        >
          <div
            className="mt-auto flex h-[85%] flex-col overflow-hidden rounded-t-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-holo-line px-4">
              <button
                type="button"
                onClick={() => setShowReplyLocationPicker(false)}
                className="text-[14px] text-holo-ink-2"
              >
                취소
              </button>
              <span className="text-[14px] font-semibold text-holo-ink">
                위치 선택
              </span>
              <button
                type="button"
                onClick={confirmReplyLocationPicker}
                disabled={!replyDraftPick}
                className="text-[14px] font-semibold text-holo-purple-mid disabled:opacity-40"
              >
                확인
              </button>
            </div>
            <div className="relative flex-1">
              <LocationPicker
                value={replyDraftPick}
                onChange={setReplyDraftPick}
                onPlaceName={(name) => {
                  setReplyDraftPlaceName((prev) => (prev.trim() ? prev : name));
                }}
              />
              <p className="pointer-events-none absolute left-1/2 top-14 z-[400] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-holo-ink-2 shadow">
                지도를 탭해 위치를 선택하세요
              </p>
            </div>
            <div className="shrink-0 border-t border-holo-line px-4 py-3">
              <label
                className="text-[12px] text-holo-ink-3"
                htmlFor="reply-place-name"
              >
                장소 이름 (선택)
              </label>
              <input
                id="reply-place-name"
                type="text"
                value={replyDraftPlaceName}
                onChange={(e) => setReplyDraftPlaceName(e.target.value)}
                placeholder="예: 미금역 1번 출구"
                className="mt-1 w-full border-b border-holo-line py-2 text-[14px] outline-none placeholder:text-holo-ink-3"
              />
            </div>
          </div>
        </div>
      )}

      {/* 모집완료 안내 */}
      <ConfirmModal
        open={showFullAlert}
        message="모집 완료 된 게시글 입니다."
        singleAction
        onConfirm={() => setShowFullAlert(false)}
      />

      {/* 미참여 상태에서 "채팅방으로 이동" 누른 경우 안내 */}
      <ConfirmModal
        open={showNotJoinedAlert}
        message="모임에 참여하지 않았습니다."
        singleAction
        onConfirm={() => setShowNotJoinedAlert(false)}
      />

      {/* 참여 확인 — "함께하기" 클릭 시 (미참여 상태) */}
      <ConfirmModal
        open={showJoinConfirm}
        message={`'${post.title}' 모임에 참여하시겠습니까?`}
        description={`현재 참여 인원 ${baseJoined}/${capacity}`}
        confirmLabel="참여"
        onCancel={() => setShowJoinConfirm(false)}
        onConfirm={confirmJoin}
      />

      {/* 취소 확인 — 참여중 상태에서 다시 클릭 시. 채팅방 퇴장 안내는 빨간 글씨로 강조. */}
      <ConfirmModal
        open={showLeaveConfirm}
        message="모임을 취소하시겠습니까?"
        description={
          <span className="text-holo-error">
            모임을 취소하시면 채팅방도 함께 나가집니다.
          </span>
        }
        confirmLabel="모임 취소"
        cancelLabel="닫기"
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={confirmLeave}
      />

      {/* 신고 확인 — 더보기 메뉴의 "신고" 클릭 시 */}
      <ConfirmModal
        open={showReportConfirm}
        message="이 게시글을 신고할까요?"
        description="운영팀에서 검토 후 조치해드려요."
        confirmLabel="신고"
        onCancel={() => setShowReportConfirm(false)}
        onConfirm={() => {
          setShowReportConfirm(false);
          // mock — 실제 신고 처리 없이 토스트로만 안내
          showToast("신고가 접수되었어요");
        }}
      />

      {/* 차단 확인 — 더보기 메뉴의 "차단" 클릭 시. 결과 안내는 빨간 글씨로 강조. */}
      <ConfirmModal
        open={showBlockConfirm}
        message={
          <>
            <span className="font-semibold">{post.authorNickname}</span>님을 차단할까요?
          </>
        }
        description={
          <span className="text-holo-error">
            차단하면 이 사용자의 게시글·메시지를 더 이상 받지 않아요.
          </span>
        }
        confirmLabel="차단"
        onCancel={() => setShowBlockConfirm(false)}
        onConfirm={() => {
          setShowBlockConfirm(false);
          // 실제로 차단을 영속화 — 이전엔 토스트만 띄우고 markBlocked 를 안 불러
          // 차단이 아무 데도 저장되지 않았다(게시판 차단 필터가 무효였음).
          markBlocked(post.authorNickname);
          showToast(`${post.authorNickname}님을 차단했어요`);
          // 차단 후엔 더 이상 이 게시글에 머물 이유가 없으므로 목록으로 복귀.
          navigate("/board/list");
        }}
      />

      {/* 토스트 — 새로고침 / URL 공유 / 신고·차단 안내 공통 출처. */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}

      {/* 사진 풀스크린 뷰어 — 댓글/게시글 첨부 사진 탭 시 크게 보기. 아무 곳이나 탭하면 닫힘. */}
      {fullImage && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullImage(null)}
          role="dialog"
          aria-label="사진 크게 보기"
        >
          <img
            src={fullImage}
            alt="첨부 사진 크게 보기"
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setFullImage(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[20px] text-white"
          >
            ×
          </button>
        </div>
      )}
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="19" r="1.2" />
    </svg>
  );
}
function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#FF9A9A" : "none"} stroke="#FF9A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C7BDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function ParticipantIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#F4C952" />
      <circle cx="12" cy="9.5" r="3" fill="#FFFFFF" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BumpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3.5-7.07" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 22V4l16 6-16 6" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="m16 6-4-4-4 4" />
      <path d="M12 2v13" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7h3l2-3h8l2 3h3v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function PhotoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6l12 12M6 18 18 6" />
    </svg>
  );
}
function CheckMark({ color = "currentColor" }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
function ReplyArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-1">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h12a4 4 0 0 1 4 4v7" />
    </svg>
  );
}
