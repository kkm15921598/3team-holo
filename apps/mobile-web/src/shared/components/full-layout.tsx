import { Outlet, useLocation } from "react-router-dom";
import { ScreenHeader } from "@/shared/components/screen-header";

const TITLES: Record<string, string> = {
  "/myroom": "마이룸",
};

function deriveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/board/")) return "게시글";
  if (pathname.startsWith("/chat/")) return "채팅";
  return "";
}

export function FullLayout() {
  const { pathname } = useLocation();
  const title = deriveTitle(pathname);

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title={title} showBack />
      <main className="flex-1 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
}
