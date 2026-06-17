import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAvatarUrl } from "@/features/chat/avatars";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  useReceivedRequests,
  useSentRequests,
} from "./friends-store";
import { awardXp } from "@/shared/stores/xp-store";

type Tab = "received" | "sent";

import { useUserFacesReady } from "@/shared/stores/user-faces-store";

export function FriendRequestsScreen() {
  // 상대의 실제 프로필 사진이 로드되면 목록을 갱신.
  useUserFacesReady();
  const navigate = useNavigate();
  const received = useReceivedRequests();
  const sent = useSentRequests();
  const [tab, setTab] = useState<Tab>(
    received.length > 0 ? "received" : "sent",
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const handleAccept = (id: string, nickname: string) => {
    const result = acceptFriendRequest(id);
    if (result.ok) {
      awardXp("friend");
      showToast(`${nickname}님과 친구가 됐어요`);
    } else if (result.reason === "max-reached") {
      showToast("친구 정원(30명)이 가득 찼어요. 기존 친구를 정리해 주세요.");
    } else {
      showToast("요청을 처리할 수 없어요.");
    }
  };

  const handleDecline = (id: string) => {
    declineFriendRequest(id);
    showToast("요청을 거절했어요");
  };

  const handleCancel = (id: string) => {
    cancelFriendRequest(id);
    showToast("요청을 취소했어요");
  };

  const list = tab === "received" ? received : sent;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          친구 요청
        </span>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-holo-line-3">
        <TabButton
          active={tab === "received"}
          label="받은 요청"
          count={received.length}
          onClick={() => setTab("received")}
        />
        <TabButton
          active={tab === "sent"}
          label="보낸 요청"
          count={sent.length}
          onClick={() => setTab("sent")}
        />
      </div>

      {/* 목록 */}
      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <span className="text-[32px]">🤝</span>
          <p className="text-[14px] text-holo-ink-3">
            {tab === "received"
              ? "받은 친구 요청이 없어요"
              : "보낸 친구 요청이 없어요"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-holo-line-3 overflow-y-auto">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/profile/${encodeURIComponent(r.nickname)}`)
                }
                className="flex flex-1 items-center gap-3 text-left"
              >
                <img
                  src={getAvatarUrl(r.nickname)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  style={{ backgroundColor: r.avatarBg }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-semibold text-holo-ink">
                    {r.nickname}
                  </span>
                  <span className="text-[12px] text-holo-ink-3">
                    {tab === "received"
                      ? `${r.timeAgo} · 친구 요청을 보냈어요`
                      : `${r.timeAgo} · 수락 대기 중`}
                  </span>
                </div>
              </button>

              {tab === "received" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(r.id, r.nickname)}
                    className="h-8 rounded-full bg-holo-purple-mid px-3 text-[12px] font-semibold text-white active:scale-[0.97]"
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(r.id)}
                    className="h-8 rounded-full border border-holo-line px-3 text-[12px] text-holo-ink-2"
                  >
                    거절
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCancel(r.id)}
                  className="h-8 shrink-0 rounded-full border border-holo-line px-3 text-[12px] text-holo-ink-2"
                >
                  요청 취소
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

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

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-[14px] ${
        active ? "font-semibold text-holo-purple-mid" : "text-holo-ink-3"
      }`}
    >
      {label}
      <span
        className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
          active
            ? "bg-holo-purple-mid text-white"
            : "bg-holo-line-3 text-holo-ink-3"
        }`}
      >
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-holo-purple-mid" />
      )}
    </button>
  );
}

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
