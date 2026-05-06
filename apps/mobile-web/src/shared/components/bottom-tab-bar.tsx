import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type TabKey = "home" | "map" | "board" | "chat" | "mypage";

const TABS: Array<{ key: TabKey; to: string; label: string; matchPrefixes: string[] }> = [
  { key: "home", to: "/home", label: "홈", matchPrefixes: ["/home"] },
  { key: "map", to: "/map", label: "지도", matchPrefixes: ["/map"] },
  { key: "board", to: "/board", label: "게시판", matchPrefixes: ["/board"] },
  { key: "chat", to: "/chat", label: "채팅", matchPrefixes: ["/chat"] },
  { key: "mypage", to: "/mypage", label: "마이", matchPrefixes: ["/mypage", "/event"] },
];

export function BottomTabBar() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky bottom-0 z-10 flex h-[72px] shrink-0 items-center justify-around border-t border-holo-line-3 bg-white">
      {TABS.map((tab) => {
        const active = tab.matchPrefixes.some((p) => pathname.startsWith(p));
        return (
          <Link
            key={tab.key}
            to={tab.to}
            className={`flex flex-col items-center gap-[3px] ${active ? "text-holo-purple-mid" : "text-holo-ink-4"}`}
          >
            <TabIcon kind={tab.key} active={active} />
            <span className="text-[12px] leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({ kind, active }: { kind: TabKey; active: boolean }): ReactNode {
  const stroke = active ? "#7448DD" : "#A8A8A8";
  const fill = active ? "#7448DD" : "none";
  switch (kind) {
    case "home":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "map":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "board":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
      );
    case "chat":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
        </svg>
      );
    case "mypage":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      );
  }
}
