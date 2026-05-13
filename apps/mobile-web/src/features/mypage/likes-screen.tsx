import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { POSTS } from "@/shared/mock/data";
import { ManagedList } from "./managed-list";

export function LikesScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">좋아요</span>
      </header>
      <ManagedList
        title="내가 누른 좋아요 목록"
        manage={manage}
        onToggleManage={() => setManage((v) => !v)}
        items={POSTS.slice(0, 5)}
      />
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
