import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useTotalUnread } from "@/features/chat/rooms-store";

type TabKey = "home" | "map" | "board" | "chat" | "my";

const TABS: Array<{
  key: TabKey;
  to: string;
  label: string;
  matchPrefixes: string[];
}> = [
  { key: "home", to: "/home", label: "홈", matchPrefixes: ["/home"] },
  { key: "map", to: "/map", label: "지도", matchPrefixes: ["/map"] },
  { key: "board", to: "/board", label: "게시판", matchPrefixes: ["/board"] },
  { key: "chat", to: "/chat", label: "채팅", matchPrefixes: ["/chat"] },
  { key: "my", to: "/mypage", label: "마이", matchPrefixes: ["/mypage", "/event"] },
];

export function BottomTabBar() {
  const { pathname } = useLocation();
  // 카카오톡처럼 채팅 탭에 안 읽은 메시지 총합을 빨간 배지로 표시.
  const totalUnread = useTotalUnread();

  return (
    <nav className="sticky bottom-0 z-10 flex h-[72px] shrink-0 items-center justify-around border-t border-holo-line-3 bg-white">
      {TABS.map((tab) => {
        const active = tab.matchPrefixes.some((p) =>
          pathname.startsWith(p)
        );
        const badge = tab.key === "chat" ? totalUnread : 0;

        return (
          <Link
            key={tab.key}
            to={tab.to}
            className={`flex flex-col items-center gap-[5px] ${
              active ? "text-holo-purple-mid" : "text-holo-ink-4"
            }`}
          >
            <span className="relative">
              <TabIcon kind={tab.key} active={active} />
              {badge > 0 && (
                <span
                  className="absolute -right-[9px] -top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-holo-error px-[5px] text-[10px] font-bold leading-none text-white ring-2 ring-white"
                  aria-label={`안 읽은 채팅 ${badge}개`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span className="text-[12px] leading-none">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function TabIcon({
  kind,
  active,
}: {
  kind: TabKey;
  active: boolean;
}): ReactNode {
  return (
    <img
      src={`/icons/sticky_bar_${kind}_${active ? "on" : "off"}.svg`}
      className={`object-contain ${
      kind === "map"
      ? "h-[22px] w-[20px]"
      : "h-[22px] w-[22px]"
      }`}
      alt=""
    />
  );
}