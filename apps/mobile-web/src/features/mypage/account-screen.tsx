import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ME } from "@/shared/mock/data";

export function AccountScreen() {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">계정관리</span>
      </header>

      <section className="px-4 pt-2">
        <p className="text-[12px] text-holo-ink-3">로그인 계정</p>
        <div className="mt-2 flex items-center justify-between rounded-holo-input bg-white p-4 shadow-holo-card">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-holo-yellow-room text-[18px]">
              👧
            </span>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-holo-ink">{ME.nickname}</span>
              <span className="text-[12px] text-holo-ink-3">ID : {ME.friendCode}</span>
            </div>
          </div>
          <span className="rounded-full bg-holo-lilac-card px-2 py-0.5 text-[11px] font-semibold text-holo-purple-mid">
            카카오
          </span>
        </div>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">계정 보안</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <Row label="이메일 변경" hint="user@holo.app" onClick={() => navigate("/mypage/account/email")} />
          <Row label="비밀번호 변경" onClick={() => navigate("/mypage/account/password")} />
          <Row label="휴대폰 번호 변경" hint="010-****-1234" onClick={() => navigate("/mypage/account/phone")} />
        </ul>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">계정 연동</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <Row label="계정 연동" hint="1개 연동됨" onClick={() => navigate("/mypage/account/link")} />
        </ul>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">기타</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <Row label="로그인 기록" onClick={() => navigate("/mypage/account/history")} />
          <Row
            label="회원 탈퇴"
            danger
            onClick={() => setShowWithdraw(true)}
          />
        </ul>
      </section>

      {showWithdraw && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[300px] rounded-[14px] bg-white p-5 text-center">
            <p className="text-[14px] font-semibold text-holo-ink">정말 탈퇴하시겠습니까?</p>
            <p className="mt-2 text-[12px] text-holo-ink-3">
              계정의 모든 데이터(글, 댓글, 친구 목록 등)가
              <br />
              영구적으로 삭제됩니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowWithdraw(false)}
                className="h-10 flex-1 rounded-full border border-holo-line text-[13px] text-holo-ink"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWithdraw(false);
                  navigate("/login");
                }}
                className="h-10 flex-1 rounded-full bg-holo-error text-[13px] font-semibold text-white"
              >
                탈퇴
              </button>
            </div>
          </div>
        </div>
      )}
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
        className={`flex w-full items-center justify-between px-4 py-3 text-left text-[14px] ${danger ? "text-holo-error" : "text-holo-ink"}`}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {hint && <span className="text-[12px] text-holo-ink-3">{hint}</span>}
          <ChevronRightIcon />
        </span>
      </button>
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
