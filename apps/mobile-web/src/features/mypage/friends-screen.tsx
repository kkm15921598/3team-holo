import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FRIENDS, ME } from "@/shared/mock/data";

export function FriendsScreen() {
  const navigate = useNavigate();
  const [manage, setManage] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <span className="text-[16px] font-semibold text-holo-ink">내 친구</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/mypage/friends/add" aria-label="친구 추가">
            <PlusIcon />
          </Link>
          <button type="button" aria-label="더보기" onClick={() => setManage((v) => !v)}>
            <MoreIcon />
          </button>
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className="text-[11px] text-holo-ink-3 underline"
          >
            {showEmpty ? "데모" : "빈상태"}
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="flex items-center gap-2 text-[14px] text-holo-ink">
          <PeopleIcon /> 친구목록
        </span>
        <span className="text-[12px] text-holo-ink-3">내 ID : {ME.friendCode}</span>
      </div>

      {showEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center text-[14px] text-holo-ink-3">
          친구를 추가 해보세요
        </div>
      ) : (
        <ul className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto px-4 pb-3">
          {FRIENDS.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <span className="relative">
                <span
                  className="block h-12 w-12 rounded-full"
                  style={{ background: f.avatarBg }}
                />
                {manage && (
                  <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-holo-error text-white">
                    <MinusIcon />
                  </span>
                )}
              </span>
              <span className="flex-1 text-[12px] text-holo-ink">{f.nickname}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-holo-line-3 p-4 text-[14px] text-holo-ink">
        <button type="button" className="flex items-center gap-2">
          <BlockIcon /> 차단한 친구
        </button>
        <button type="button" className="flex items-center gap-2">
          <FlagIcon /> 신고하기
        </button>
      </div>
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
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A" aria-hidden>
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1A1A" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="#1A1A1A" strokeWidth="1.5" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
