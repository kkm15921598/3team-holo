import { Link, useNavigate } from "react-router-dom";

/**
 * 고객센터 허브 — 공지사항 / 이벤트 / 1:1 문의를 한 곳에 모은 지원 메뉴.
 * (마이페이지 설정의 '고객센터' 진입점. 1:1 문의는 기존 문의/FAQ 화면 재사용.)
 */
export function SupportScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">고객센터</span>
      </header>

      <ul className="mt-1 flex flex-col px-4 text-[15px] text-holo-ink">
        <SupportItem
          to="/mypage/notices"
          label="공지사항"
          desc="업데이트·점검 등 안내"
          icon="📢"
        />
        <SupportItem
          to="/mypage/events"
          label="이벤트"
          desc="진행 중인 이벤트·혜택"
          icon="🎉"
        />
        <SupportItem
          to="/mypage/help"
          label="1:1 문의"
          desc="문의하기 · 자주 묻는 질문"
          icon="💬"
        />
      </ul>
    </main>
  );
}

function SupportItem({
  to,
  label,
  desc,
  icon,
}: {
  to: string;
  label: string;
  desc: string;
  icon: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="-mx-1 flex min-h-[60px] w-full items-center gap-3 rounded-[12px] px-1 active:bg-holo-surface-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card-2 text-[18px]">
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
