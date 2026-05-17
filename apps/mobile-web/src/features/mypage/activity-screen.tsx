import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type Post } from "@/shared/mock/data";
import { postsStore } from "@/features/board/posts-store";
import { useUserComments } from "@/shared/stores/comments-store";
import { useActivityState } from "@/shared/stores/activity-store";
import { useProfile } from "@/shared/hooks/use-profile";

export function ActivityScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const userComments = useUserComments();
  const activity = useActivityState();
  const [allPosts, setAllPosts] = useState<Post[]>(postsStore.getPosts());

  useEffect(() => {
    return postsStore.subscribe(() => setAllPosts(postsStore.getPosts()));
  }, []);

  // 실제 사용자가 작성한 글 / 댓글 수
  const postsCount = useMemo(
    () => allPosts.filter((p) => p.authorNickname === profile.nickname).length,
    [allPosts, profile.nickname],
  );
  const commentsCount = userComments.length;
  const activeDays = activity.activeDates.length;

  return (
    <main className="flex flex-1 flex-col px-4 pb-4">
      <header className="flex h-12 shrink-0 items-center">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">내 활동</span>
      </header>

      {/* 통계 카드 — 라일락 그라데이션 + 세로 구분선 + 아이콘 */}
      <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-[#F4EEFF] via-[#EFE5FF] to-[#E6D7FF] p-[1px] shadow-[0_4px_16px_rgba(116,72,221,0.10)]">
        <div className="flex items-stretch justify-around rounded-[17px] bg-white/70 py-5 backdrop-blur">
          <StatCell
            icon={<PencilIcon />}
            label="내가 쓴 글"
            value={postsCount}
          />
          <span className="my-1 w-px self-stretch bg-holo-line/70" />
          <StatCell
            icon={<BubbleIcon />}
            label="내가 쓴 댓글"
            value={commentsCount}
          />
          <span className="my-1 w-px self-stretch bg-holo-line/70" />
          <StatCell
            icon={<CalendarIcon />}
            label="접속일수"
            value={activeDays}
            suffix="일"
          />
        </div>
      </section>

      {/* 활동 목록 — 아이콘 + 라벨 + 카운트 + 화살표 */}
      <ul className="mt-4 flex flex-col gap-2">
        <ActivityRow
          to="/mypage/posts"
          icon={<PencilIcon />}
          iconBg="bg-[#EFE5FF]"
          iconColor="text-holo-purple-mid"
          label="내가 쓴 글"
          count={postsCount}
        />
        <ActivityRow
          to="/mypage/comments"
          icon={<BubbleIcon />}
          iconBg="bg-[#FFE7F0]"
          iconColor="text-[#D6488A]"
          label="내가 쓴 댓글"
          count={commentsCount}
        />
        <ActivityRow
          to="/mypage/recent"
          icon={<ClockIcon />}
          iconBg="bg-[#FFF0DA]"
          iconColor="text-[#C97A1F]"
          label="최근 본 글"
        />
      </ul>

      {/* CTA — 라일락 카드 + 작은 일러스트 + pill 버튼 */}
      <Link
        to="/mypage/friends"
        className="mt-auto flex items-center gap-3 overflow-hidden rounded-[18px] bg-gradient-to-br from-holo-lilac-card-2 to-[#F1E6FF] p-5 shadow-[0_4px_16px_rgba(116,72,221,0.10)] transition active:scale-[0.99]"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[15px] font-bold leading-snug text-holo-ink">
            나와 닮은 이웃의
            <br />
            방으로 놀러가볼까요?
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-holo-ink-3">
            게시판에서 다양한 사람들의
            <br />
            이야기를 만나보세요!
          </p>
          <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-holo-gradient px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_2px_6.9px_rgba(84,43,180,0.35)]">
            이웃찾기
            <ArrowRightSmall />
          </span>
        </div>
        <NeighborhoodIllustration />
      </Link>
    </main>
  );
}

function StatCell({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-holo-purple-mid shadow-[0_1px_3px_rgba(116,72,221,0.15)]">
        {icon}
      </span>
      <span className="text-[11px] text-holo-ink-3">{label}</span>
      <span className="flex items-baseline gap-0.5 text-holo-ink">
        <span className="text-[20px] font-bold leading-none">{value}</span>
        {suffix && (
          <span className="text-[11px] font-medium text-holo-ink-3">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}

function ActivityRow({
  to,
  icon,
  iconBg,
  iconColor,
  label,
  count,
}: {
  to: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  count?: number;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 ring-1 ring-holo-line-3 transition active:scale-[0.99] active:bg-holo-lilac-soft/40"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
        >
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-medium text-holo-ink">
          {label}
        </span>
        {count !== undefined && (
          <span className="text-[13px] font-semibold text-holo-purple-mid">
            {count}
          </span>
        )}
        <ChevronRightIcon />
      </Link>
    </li>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function BubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function ArrowRightSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

/**
 * CTA 카드 우측의 작은 일러스트 — 작은 집 / 창문 모양으로 "이웃 방" 컨셉.
 * 기존 📒 이모지보다 톤·언밸런스 없이 라일락 팔레트에 어울리도록 SVG 로 구성.
 */
function NeighborhoodIllustration() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 68 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      {/* 뒷쪽 집 */}
      <path
        d="M10 32 L22 22 L34 32 L34 56 L10 56 Z"
        fill="#C7BDFF"
        stroke="#7448DD"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="17" y="38" width="10" height="10" fill="#FFFFFF" stroke="#7448DD" strokeWidth="1.2" />
      <path d="M22 38 V48 M17 43 H27" stroke="#7448DD" strokeWidth="1" />
      {/* 앞쪽 집 */}
      <path
        d="M30 36 L44 24 L58 36 L58 58 L30 58 Z"
        fill="#FFFFFF"
        stroke="#7448DD"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="40" y="44" width="8" height="14" fill="#7448DD" rx="1.5" />
      <circle cx="46" cy="51" r="0.9" fill="#FFFFFF" />
      <rect x="33" y="40" width="5" height="5" fill="#FFE08A" stroke="#7448DD" strokeWidth="1" />
      <rect x="50" y="40" width="5" height="5" fill="#FFE08A" stroke="#7448DD" strokeWidth="1" />
      {/* 하트 — 이웃과의 연결 */}
      <path
        d="M44 16 C 42 12, 36 13, 36 18 C 36 22, 44 26, 44 26 C 44 26, 52 22, 52 18 C 52 13, 46 12, 44 16 Z"
        fill="#FF9AB8"
        stroke="#D6488A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
