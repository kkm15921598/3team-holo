import { Link, useNavigate } from "react-router-dom";

/**
 * 고객센터 허브 — 공지사항 / 이벤트 / 1:1 문의를 한 곳에 모은 지원 메뉴.
 * (마이페이지 설정의 '고객센터' 진입점. 1:1 문의는 기존 문의/FAQ 화면 재사용.)
 */
export function SupportScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col bg-white pb-6">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">고객센터</span>
      </header>

      {/* 계정관리·개인정보·알림설정과 동일한 풀폭 행 패턴(행 사이 헤어라인). */}
      <ul className="flex flex-col divide-y divide-holo-line-3">
        <SupportItem
          to="/mypage/notices"
          label="공지사항"
          desc="업데이트·점검 등 안내"
          icon={<NoticeIcon />}
        />
        <SupportItem
          to="/mypage/events"
          label="이벤트"
          desc="진행 중인 이벤트·혜택"
          icon={<GiftIcon />}
        />
        <SupportItem
          to="/mypage/help"
          label="1:1 문의"
          desc="문의하기 · 자주 묻는 질문"
          icon={<ChatIcon />}
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
  icon: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-[64px] w-full items-center gap-3 px-4 active:bg-holo-surface-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card-2 text-holo-purple-mid">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold text-holo-ink">{label}</span>
          <span className="mt-0.5 text-[12px] text-holo-ink-3">{desc}</span>
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

// ── 고객센터 항목 아이콘 — 설정과 같은 구글(Material) 라인 스타일.
function NoticeIcon() {
  // campaign(확성기) — 공지사항
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8a4 4 0 0 1 0 8" />
      <path d="M7 14v3a1 1 0 0 0 1 1h1" />
    </svg>
  );
}
function GiftIcon() {
  // gift — 이벤트
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M2 9h20M12 9v11" />
      <path d="M12 9S10.5 4 8.5 4 5.5 6.5 7 8s5 1 5 1 3.5.5 5-1-.5-4-2.5-4S12 9 12 9Z" />
    </svg>
  );
}
function ChatIcon() {
  // chat_bubble — 1:1 문의
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 21 12Z" />
    </svg>
  );
}
