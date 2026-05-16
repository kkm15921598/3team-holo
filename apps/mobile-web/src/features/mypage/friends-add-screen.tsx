import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";
import { sendFriendRequest } from "./friends-store";
import { useProfile } from "@/shared/hooks/use-profile";

export function FriendsAddScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"id" | "qr">("id");
  const [input, setInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // 표시되는 내 닉네임은 현재 로그인 계정의 프로필을 따른다 — ME 는 데모용 고정값.
  const profile = useProfile();

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const handleAdd = () => {
    const nick = input.trim();
    if (!nick) {
      showToast("닉네임 또는 ID를 입력해 주세요.");
      return;
    }
    const result = sendFriendRequest(nick);
    switch (result) {
      case "sent":
        showToast(`${nick}님에게 친구 요청을 보냈어요.`);
        setInput("");
        window.setTimeout(
          () => navigate("/mypage/friends/requests", { replace: true }),
          700,
        );
        return;
      case "already-friend":
        showToast("이미 친구 목록에 있어요.");
        return;
      case "already-sent":
        showToast("이미 친구 요청을 보냈어요.");
        return;
      case "incoming-exists":
        showToast(
          `${nick}님이 먼저 요청을 보냈어요. 받은 요청에서 수락해 주세요.`,
        );
        return;
      case "max-reached":
        showToast("친구 정원(30명)이 가득 찼어요. 기존 친구를 정리해 주세요.");
        return;
      default:
        showToast("친구 요청을 보낼 수 없어요.");
        return;
    }
  };

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
            <p className="self-start text-[16px] font-semibold text-holo-ink">{profile.nickname}</p>
            <p className="self-start text-[14px] text-holo-ink-3">ID : {ME.friendCode}</p>
            <div className="mt-4 flex h-[200px] w-[200px] items-center justify-center rounded-holo-card bg-holo-ink-4">
              <QrPlaceholder />
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-[300px] flex-col gap-3">
            <div className="flex w-full flex-col rounded-holo-card bg-white p-5">
              <p className="text-[14px] font-semibold text-holo-ink">친구 ID 입력</p>
              <p className="mt-1 text-[12px] text-holo-ink-3">
                요청을 보내면 상대가 수락한 뒤 친구가 돼요.
              </p>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                placeholder="ID 또는 닉네임을 입력하세요"
                className="mt-3 h-[44px] rounded-holo-input border border-holo-line px-4 text-[14px] outline-none placeholder:text-holo-ink-3 focus:border-2 focus:border-holo-purple-mid"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="mt-4 h-[44px] rounded-full bg-holo-purple-mid text-[14px] font-semibold text-white"
              >
                친구 요청 보내기
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
            {toast}
          </div>
        </div>
      )}
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
