import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { AppHeader } from "./app-header";
import { BottomTabBar } from "./bottom-tab-bar";

type TabLayoutProps = {
  children: ReactNode;
  showHeader?: boolean;
};

export function TabLayout({ children, showHeader = true }: TabLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();

  // ── 페이지 이동 시 스크롤 위치 처리 ────────────────────────────────
  // PUSH (탭 클릭 등 새 페이지 진입) → 상단으로 리셋. "스크롤 내린 상태로 다른 탭
  //   누르면 스크롤이 내려진 채 뜨는" 어색한 동작 방지.
  // POP (브라우저 뒤로가기 / 앞으로가기) → 리셋하지 않음 — 페이지 자체가 스크롤
  //   복원 로직을 갖고 있다면(예: 게시판 리스트) 그쪽이 동작하도록 양보.
  useEffect(() => {
    if (navigationType === "POP") return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    // 페이지 내부에서 자체적으로 스크롤되는 요소(예: ul.overflow-y-auto) 도 위로.
    // 마운트 직후 한 번만 시도해도 충분.
  }, [location.pathname, location.search, navigationType]);

  return (
    <>
      {showHeader && <AppHeader />}
      <div
        ref={scrollRef}
        className="no-scrollbar flex flex-1 flex-col overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
      <BottomTabBar />
    </>
  );
}
