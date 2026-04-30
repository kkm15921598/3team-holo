import { Outlet } from "react-router-dom";
import { BottomTabBar } from "@/shared/components/bottom-tab-bar";
import { ScreenHeader } from "@/shared/components/screen-header";

export function TabLayout() {
  return (
    <div className="relative flex flex-1 flex-col">
      <ScreenHeader />
      <main className="flex-1 overflow-y-auto bg-white pb-20">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
