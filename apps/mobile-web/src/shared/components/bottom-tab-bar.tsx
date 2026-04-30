import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type Tab = {
  to: string;
  label: string;
  end?: boolean;
  icon: (active: boolean) => ReactNode;
};

const TABS: Tab[] = [
  { to: "/", label: "홈", end: true, icon: (a) => <HomeIcon active={a} /> },
  { to: "/map", label: "지도", icon: (a) => <MapIcon active={a} /> },
  { to: "/board", label: "게시판", icon: (a) => <BoardIcon active={a} /> },
  { to: "/chat", label: "채팅", icon: (a) => <ChatIcon active={a} /> },
  { to: "/me", label: "마이", icon: (a) => <UserIcon active={a} /> },
];

export function BottomTabBar() {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-stretch border-t border-gray-100 bg-white">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              isActive ? "text-holo-purple" : "text-gray-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {tab.icon(isActive)}
              <span className="font-medium">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

type IconProps = { active: boolean };
const stroke = (active: boolean) => (active ? "#B77CFF" : "currentColor");

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function MapIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  );
}

function BoardIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function ChatIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
    </svg>
  );
}

function UserIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
