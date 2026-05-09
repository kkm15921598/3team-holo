import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { BottomTabBar } from "./bottom-tab-bar";

type TabLayoutProps = {
  children: ReactNode;
  showHeader?: boolean;
};

export function TabLayout({ children, showHeader = true }: TabLayoutProps) {
  return (
    <>
      {showHeader && <AppHeader />}
      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      <BottomTabBar />
    </>
  );
}
