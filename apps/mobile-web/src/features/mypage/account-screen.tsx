import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ME_PERSONA } from "@/features/home/home-faces";
import { useProfile } from "@/shared/hooks/use-profile";
import {
  getVerification,
  subscribeVerification,
} from "@/shared/stores/verification-store";
import { resetAllStoresForFreshSignup } from "@/shared/lib/fresh-signup-reset";
import { getCurrentPhone, getCurrentPhoneMasked } from "@/shared/lib/phone";
import { clearCurrentAccount } from "@/shared/stores/account-choices-store";
import { supabase } from "@/shared/lib/supabaseClient";
import { ConfirmModal } from "@/shared/components/confirm-modal";

export function AccountScreen() {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [verification, setVerification] = useState(getVerification);
  const profile = useProfile();

  useEffect(() => {
    const unsub = subscribeVerification(() => setVerification(getVerification()));
    return unsub;
  }, []);

  // 위치(동네) 인증 여부만으로 뱃지 토글 — 휴대폰 인증은 가입 시 끝나니 별도 안내 없이 통합.
  // 실제 위치 인증을 거치면 '인증완료' 로 자동 전환된다.
  const regionVerified = verification.regionVerified;
  const faceSrc = profile.profileFace ?? ME_PERSONA.face;
  // 가입/로그인 시 저장된 실제 번호를 마스킹해 표시 (하드코딩 제거).
  const phoneMasked = getCurrentPhoneMasked();

  // 가입 날짜 — 우선 localStorage 의 holoUser.signupAt 으로 즉시 표시하고,
  // 이후 Supabase users.created_at 으로 정확히 보정한다(다른 기기 로그인 등 로컬값이 없는 경우 대비).
  const [signupDate, setSignupDate] = useState<string>(() => {
    try {
      const raw = window.localStorage.getItem("holoUser");
      if (raw) {
        const parsed = JSON.parse(raw) as { signupAt?: number };
        if (parsed?.signupAt) return formatSignupDate(new Date(parsed.signupAt));
      }
    } catch {
      // ignore
    }
    return "";
  });

  useEffect(() => {
    const phone = getCurrentPhone();
    if (!phone) return;
    let cancelled = false;
    supabase
      .from("users")
      .select("created_at")
      .eq("phone", phone)
      .single()
      .then(({ data, error }) => {
        if (cancelled || error || !data?.created_at) return;
        setSignupDate(formatSignupDate(new Date(data.created_at as string)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col bg-white pb-6">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">계정관리</span>
      </header>

      {/* 프로필 — 카드 없이 화면 폭 그대로(대기업 설정 첫 블록 패턴). */}
      <section className="flex items-center justify-between px-4 py-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src={faceSrc}
            alt={profile.nickname}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
            draggable={false}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[16px] font-semibold text-holo-ink">
              {profile.nickname}
            </span>
            <span className="mt-0.5 text-[13px] text-holo-ink-3">
              ID : {profile.friendCode}
            </span>
          </div>
        </div>
        {/* 위치 인증 뱃지 — 클릭하면 동네 인증 화면으로 이동. */}
        <button
          type="button"
          onClick={() => navigate("/mypage/verify-region")}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
            regionVerified
              ? "bg-holo-lilac-card text-holo-purple-mid"
              : "bg-holo-line-2/50 text-holo-ink-3 hover:bg-holo-line-2"
          }`}
          aria-label={
            regionVerified
              ? "동네 인증 완료 — 재인증하려면 클릭"
              : "동네 인증하기"
          }
        >
          {regionVerified ? "인증완료" : "미인증"}
        </button>
      </section>
      {/* 가입일 캡션 */}
      <p className="flex items-center gap-1.5 px-4 pb-5 text-[12px] text-holo-ink-3">
        <CalendarIcon />{" "}
        {signupDate
          ? `${signupDate}부터 HOLO와 함께하고 있어요`
          : "HOLO와 함께하고 있어요"}
      </p>

      {/* 그룹 사이 연한 회색 띠 — 카드/그림자 대신 면으로 구분(토스·카카오 패턴). */}
      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 계정 보안 */}
      <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">
        계정 보안
      </p>
      <ul className="flex flex-col divide-y divide-holo-line-3">
        {/* 이메일 변경 항목은 휴대폰 본인인증 기반 가입이라 의미가 없어 제거 */}
        <Row label="비밀번호 변경" onClick={() => navigate("/mypage/account/password")} />
        <Row label="휴대폰 번호 변경" hint={phoneMasked} onClick={() => navigate("/mypage/account/phone")} />
      </ul>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 기타 */}
      <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">기타</p>
      <ul className="flex flex-col divide-y divide-holo-line-3">
        <Row label="회원 탈퇴" danger onClick={() => setShowWithdraw(true)} />
      </ul>

      <ConfirmModal
        open={showWithdraw}
        message="정말 탈퇴하시겠습니까?"
        description={
          <>
            계정의 모든 데이터(글, 댓글, 친구 목록 등)가
            <br />
            영구적으로 삭제됩니다.
          </>
        }
        confirmLabel="탈퇴"
        onCancel={() => setShowWithdraw(false)}
        onConfirm={async () => {
          // 서버 계정/데이터를 실제로 삭제 — 안 그러면 '영구 삭제' 안내와 달리 같은 번호로
          // 재가입이 막히고(중복검사) 재로그인도 됐다. (모두 best-effort, 실패해도 로컬 탈퇴 진행)
          // 포인터를 비우기 전에 번호를 캡처한다.
          const phone = getCurrentPhone();
          if (phone) {
            try {
              await supabase.from("posts").update({ is_deleted: true }).eq("author_phone", phone);
            } catch {
              // ignore
            }
            try {
              await supabase.from("friends").delete().eq("user_phone", phone);
            } catch {
              // ignore
            }
            try {
              await supabase.from("users").delete().eq("phone", phone);
            } catch {
              // ignore
            }
          }
          // [Auth 전환 3단계] 탈퇴 시 로그인으로 만든 Supabase Auth 세션도 정리한다.
          // 안 하면 세션이 브라우저에 남아 JWT 만료 후 만료 토큰을 계속 보내 401 이 난다.
          // best-effort: 실패해도(이미 만료/네트워크 오류) 로컬 세션은 제거되며 탈퇴는 진행한다.
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
          // 현재 계정 포인터를 먼저 비운다 — 아래 리셋이 일으키는 setter 의 Supabase 쓰기가
          // 탈퇴하는 계정 row 를 기본값(레벨1 등)으로 덮어쓰지 않도록(웬디 QA 지적 비대칭 차단).
          clearCurrentAccount();
          // 모든 사용자 store 초기화 — 글/댓글/좋아요/참여/친구/마이룸/포인트/인증/접속이력 등.
          // 로그인 화면으로 보낼 때 잔여 데이터가 다음 가입자에게 누설되지 않게 한다.
          resetAllStoresForFreshSignup();
          setShowWithdraw(false);
          navigate("/login", { replace: true });
        }}
      />
    </main>
  );
}

function Row({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex min-h-[56px] w-full items-center justify-between px-4 text-left text-[15px] active:bg-holo-surface-2 ${danger ? "text-holo-error" : "text-holo-ink"}`}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {hint && <span className="text-[13px] text-holo-ink-3">{hint}</span>}
          <ChevronRightIcon />
        </span>
      </button>
    </li>
  );
}

/** 가입 시각을 "2026년 5월 29일" 형태로 포맷 */
function formatSignupDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
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
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
