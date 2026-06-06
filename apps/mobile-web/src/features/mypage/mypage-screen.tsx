import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ME_PERSONA } from "@/features/home/home-faces";
import { useProfile } from "@/shared/hooks/use-profile";
import { getEquippedBadgeSrc } from "@/shared/stores/profile-store";
import { usePoints } from "@/features/myroom/myroom-store";
import { useJoinedSet } from "@/shared/stores/joined-store";
import { postsStore } from "@/features/board/posts-store";
import { evaluateAchievements } from "@/shared/lib/achievements";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import { useVerification, syncVerificationFromSupabase } from "@/shared/stores/verification-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { clearCurrentAccount } from "@/shared/stores/account-choices-store";
import { resetUserStoresForLogin } from "@/shared/lib/fresh-signup-reset";
import { logoutAuth } from "@/shared/lib/auth";

export function MypageScreen() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const profile = useProfile();
  const points = usePoints();
  const badgeSrc = getEquippedBadgeSrc();
  const joinedSet = useJoinedSet();
  // 글 목록 변화(삭제/추가)에도 모임수가 갱신되도록 postsStore 구독.
  const [, setPostsTick] = useState(0);
  useEffect(() => postsStore.subscribe(() => setPostsTick((t) => t + 1)), []);
  // 마이페이지 진입 시 배지/칭호 기준 충족분 자동 발급(멱등).
  useEffect(() => {
    evaluateAchievements();
  }, []);
  // 마이페이지 진입 시 인증 상태 복원 재시도 — SPA 로그인/탭 전환으로 load-event sync 를
  // 놓쳤거나 동네 라벨이 비어 "동네를 인증해주세요" 로 잘못 떠 있던 경우, 백업/서버에서 되살린다.
  useEffect(() => {
    void syncVerificationFromSupabase();
  }, []);
  // '모임 참여' 수 — 현재 살아있는 글만 센다(my-meetings 목록과 동일 기준).
  // joinedSet 은 글 삭제 시 정리되지 않아 size 를 그대로 쓰면 삭제된 모임까지 세어 목록과 어긋난다.
  const meetupCount = postsStore.getPosts().filter((p) => joinedSet.has(p.id)).length;
  const stats = useAccountStats();
  // 동네 인증 화면에서 저장한 동(洞) 이 있으면 그걸 표시, 없으면 인증 유도 문구.
  const verification = useVerification();
  // regionVerified 가 true 면 라벨이 비어도(서버 컬럼 미존재 등으로 동 이름 유실) 인증 안내를
  // 띄우지 않는다 — "이미 인증했는데 또 하라고 뜨는" 오인 차단.
  const isRegionUnset = !verification.verifiedRegion && !verification.regionVerified;
  const regionLabel =
    verification.verifiedRegion ??
    (verification.regionVerified ? "동네 인증 완료" : "동네를 인증해주세요");
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-4">
      {/* Profile card + Points (connected, full-width edge-to-edge) */}
      <section className="-mx-4">
        <div className="bg-holo-lilac-card-2 p-4">
          <div className="flex items-center gap-3">
            {/* 아바타+닉네임+칭호 영역 — 클릭 시 친구 프로필과 동일한 상세 화면(/profile/{nickname}) 으로 이동.
                isMe 분기로 본인 룸/스탯/실데이터가 표시된다.
                편집 아이콘은 별도 Link 라 stopPropagation 없이도 분리 동작. */}
            <Link
              to={`/profile/${encodeURIComponent(profile.nickname)}`}
              className="flex flex-1 items-center gap-3 active:opacity-80"
              aria-label="내 프로필 보기"
            >
              <img
                src={profile.profileFace ?? ME_PERSONA.face}
                alt={profile.nickname}
                className="h-14 w-14 shrink-0 rounded-full bg-holo-yellow-room object-cover"
                draggable={false}
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[20px] font-semibold text-holo-ink">{profile.nickname}</span>
                  {badgeSrc && (
                    <img src={badgeSrc} alt="장착 뱃지" className="h-6 w-6 object-contain" />
                  )}
                </div>
                <span className="text-[15px] text-holo-ink-3">{profile.title}</span>
              </div>
            </Link>
            <Link to="/mypage/edit" aria-label="프로필 편집">
              <EditIcon />
            </Link>
          </div>
        </div>
        <Link
          to="/mypage/points"
          className="flex items-center justify-between bg-holo-purple-mid px-4 py-3 text-white"
        >
          <span className="text-[14px] font-semibold">나의 포인트</span>
          <span className="text-[16px] font-bold">{points}P</span>
        </Link>
      </section>

      {/* Stats — 박스 없이 양 끝까지 균등 배치 (가장자리 22px padding) */}
      <section className="-mx-4 flex items-center justify-between px-[22px] py-2">
        <StatLink to="/mypage/level" label="나의 레벨" value={stats.level} />
        <span className="h-10 w-px bg-holo-line" />
        <StatLink to="/mypage/badges" label="나의 뱃지" value={stats.acquiredBadgeIds.length} />
        <span className="h-10 w-px bg-holo-line" />
        <StatLink to="/mypage/titles" label="나의 칭호" value={stats.acquiredTitles.length} />
        <span className="h-10 w-px bg-holo-line" />
        <StatLink to="/mypage/meetings" label="모임 참여" value={meetupCount} />
      </section>

      {/* Region verify */}
      <section className="flex items-center justify-between rounded-holo-input bg-white px-4 py-3 shadow-holo-card">
        <span
          className={`flex items-center gap-2 text-[14px] ${
            isRegionUnset ? "text-holo-ink-3" : "text-holo-ink"
          }`}
        >
          <PinIcon /> {regionLabel}
        </span>
        <button
          type="button"
          onClick={() => navigate("/mypage/verify-region")}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
            verification.regionVerified
              ? "border border-holo-purple-mid text-holo-purple-mid"
              : "bg-holo-purple-mid text-white"
          }`}
        >
          {verification.regionVerified ? "재인증" : "인증하기"}
        </button>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-2">
        <Quick to="/mypage/activity" label="내 활동" icon={<NoteIcon />} />
        <Quick to="/mypage/likes" label="좋아요" icon={<HeartIcon />} />
        <Quick to="/mypage/friends" label="내 친구" icon={<PeopleIcon />} />
      </section>

      {/* Settings */}
      <section className="mt-2">
        <p className="text-[17px] font-bold text-holo-ink">설정</p>
        <hr className="mt-2 border-t border-holo-line-3" />
        {/* 설정 리스트 — 넉넉한 터치영역(행 54px)+탭 피드백. 항목 사이 구분선은 빼서
            제목 아래 선(hr)만 남긴다 — 항목마다 선을 넣으면 제목/항목 구분이 안 돼 혼란. */}
        <ul className="mt-1 flex flex-col text-[15px] text-holo-ink">
          <SettingItem icon={<AccountIcon />} label="계정관리" desc="로그인·비밀번호·전화번호" to="/mypage/account" />
          <SettingItem icon={<PrivacyIcon />} label="개인정보" desc="위치공유·친구요청·약관" to="/mypage/privacy" />
          <SettingItem icon={<BellIcon />} label="알림설정" desc="푸시·방해금지 시간" to="/mypage/notifications" />
          <SettingItem icon={<SupportIcon />} label="고객센터" desc="공지·이벤트·문의" to="/mypage/support" />
        </ul>

        {/* 로그아웃 — 화면 이동이 아니라 '나가기' 동작이라 리스트에서 분리(대기업 스타일).
            구분선 위, 가운데 회색 텍스트, chevron 없음. */}
        <button
          type="button"
          onClick={() => setShowLogout(true)}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center border-t border-holo-line-3 text-[14px] text-holo-ink-3 active:opacity-60"
        >
          로그아웃
        </button>
      </section>

      <ConfirmModal
        open={showLogout}
        message="로그아웃 하시겠어요?"
        description="다시 로그인해야 서비스를 이용할 수 있어요."
        confirmLabel="로그아웃"
        onCancel={() => setShowLogout(false)}
        onConfirm={() => {
          // 로그아웃 시 사용자별 store 를 비우고 계정 포인터를 끊는다 — 안 하면 다음 로그인
          // 전까지 이전 계정 데이터(프로필/친구/포인트/알림 등)가 메모리에 남아 누설된다.
          // (탈퇴 흐름 account-screen 과 동일 패턴: 계정 포인터 먼저 비운 뒤 리셋)
          void logoutAuth(); // Supabase Auth 세션 종료 — 안 하면 RLS 권한이 남는다
          clearCurrentAccount();
          resetUserStoresForLogin();
          setShowLogout(false);
          navigate("/login", { replace: true });
        }}
      />
    </main>
  );
}

function SettingItem({
  icon,
  label,
  desc,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  to: string;
}) {
  // 고객센터 허브와 동일한 스타일로 통일 — 아이콘 원 + 라벨 + 설명 + 화살표.
  // 아이콘은 구글(Material) 라인 스타일 SVG, 라일락 원 위에 보라색 선.
  return (
    <li>
      <Link
        to={to}
        className="-mx-1 flex min-h-[60px] w-full items-center gap-3 rounded-[12px] px-1 text-left active:bg-holo-surface-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card-2 text-holo-purple-mid">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-holo-ink">{label}</span>
          <span className="text-[12px] text-holo-ink-3">{desc}</span>
        </span>
        <ChevronRightIcon />
      </Link>
    </li>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// ── 설정 항목 아이콘 — 구글(Material) 라인 스타일. stroke=currentColor 로 부모(보라)색 상속.
function AccountIcon() {
  // person — 계정관리
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
    </svg>
  );
}
function PrivacyIcon() {
  // lock — 개인정보
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BellIcon() {
  // notifications — 알림설정
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
function SupportIcon() {
  // support_agent (headset) — 고객센터
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" />
      <path d="M20 19a4 4 0 0 1-4 3h-2" />
    </svg>
  );
}

function StatLink({ to, label, value }: { to: string; label: string; value: number }) {
  return (
    <Link to={to} className="flex flex-col items-center active:opacity-70">
      <span className="text-[12px] text-holo-ink-3">{label}</span>
      <span className="mt-0.5 text-[18px] font-bold text-holo-ink">{value}</span>
    </Link>
  );
}
function Quick({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex h-[80px] flex-col items-center justify-center gap-1 rounded-holo-input bg-white shadow-holo-card"
    >
      <span className="text-holo-purple-mid">{icon}</span>
      <span className="text-[13px] text-holo-ink">{label}</span>
    </Link>
  );
}
function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 3 4 4-12 12H5v-4z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#7448DD" stroke="#7448DD" strokeWidth="1" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6M14 14c2.5 0 7 1.5 7 5" />
    </svg>
  );
}
