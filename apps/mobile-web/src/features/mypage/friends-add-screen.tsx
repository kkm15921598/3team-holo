import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";

export function FriendsAddScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"id" | "qr">("qr");

  return (
    <main className="absolute inset-0 z-30 flex flex-col bg-black/50">
      <header className="flex h-12 shrink-0 items-center justify-between bg-white px-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="닫기" onClick={() => navigate(-1)}>
            <CloseIcon />
          </button>
          <span className="text-[16px] font-semibold text-holo-ink">친구추가</span>
        </div>
        <div className="flex items-center gap-3 text-[14px] font-normal text-[#5d5d5d]">
          <button
            type="button"
            onClick={() => setTab("id")}
            className="flex items-center gap-1"
          >
            <KeyboardIcon /> ID로 추가
          </button>
          <span className="h-3 w-px bg-holo-line" />
          <button
            type="button"
            onClick={() => setTab("qr")}
            className="flex items-center gap-1"
          >
            <QrIcon /> QR코드
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {tab === "qr" ? (
          <div className="flex w-full max-w-[260px] flex-col items-center rounded-holo-card bg-white p-5">
            <p className="self-start text-[16px] font-semibold text-holo-ink">{ME.nickname}</p>
            <p className="self-start text-[14px] text-holo-ink-3">ID : {ME.friendCode}</p>
            <div className="mt-4 flex h-[200px] w-[200px] items-center justify-center rounded-holo-card bg-holo-ink-4">
              <QrPlaceholder />
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-[300px] flex-col rounded-holo-card bg-white p-5">
            <p className="text-[14px] font-semibold text-holo-ink">친구 ID 입력</p>
            <input
              placeholder="ID를 입력하세요"
              className="mt-3 h-[44px] rounded-holo-input border border-holo-line px-4 text-[14px] outline-none placeholder:text-holo-ink-3 focus:border-2 focus:border-holo-purple-mid"
            />
            <button
              type="button"
              className="mt-4 h-[44px] rounded-full bg-holo-purple-mid text-[14px] font-semibold text-white"
            >
              검색
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function KeyboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
    </svg>
  );
}
function QrPlaceholder() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden>
      <rect width="140" height="140" fill="#fff" />
      <g fill="#000">
        <rect x="10" y="10" width="30" height="30" />
        <rect x="100" y="10" width="30" height="30" />
        <rect x="10" y="100" width="30" height="30" />
        <rect x="50" y="50" width="10" height="10" />
        <rect x="70" y="50" width="10" height="10" />
        <rect x="60" y="70" width="20" height="10" />
        <rect x="50" y="90" width="10" height="10" />
        <rect x="80" y="90" width="20" height="10" />
        <rect x="100" y="60" width="10" height="20" />
        <rect x="120" y="80" width="10" height="20" />
        <rect x="50" y="110" width="40" height="10" />
      </g>
    </svg>
  );
}
