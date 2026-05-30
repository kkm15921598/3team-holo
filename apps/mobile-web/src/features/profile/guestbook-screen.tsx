import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  GUESTBOOK_STAMPS,
  useGuestbook,
  type GuestbookEntry,
} from "@/features/myroom/guestbook-store";
import { isMyNickname } from "@/shared/stores/profile-store";
import { getCurrentAccount } from "@/shared/stores/account-choices-store";
import { getAvatarUrl } from "@/features/chat/avatars";

/** 잘못된 % 인코딩 URL 이면 decodeURIComponent 가 throw 해 화면이 깨진다 — 실패 시 원문 사용. */
function safeDecode(id: string | undefined): string {
  if (!id) return "";
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

/** epoch ms → "방금 / N분 전 / N시간 전 / M.D" */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/**
 * 마이룸 방명록 화면 — 이웃 방에 도장+한 줄 남기기.
 * URL 닉네임이 방 주인. 내 방이면 받은 방명록만 보고(작성 X), 남의 방이면 작성 가능.
 */
export function GuestbookScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const owner = safeDecode(id);
  const isMyRoom = isMyNickname(owner);
  const myPhone = getCurrentAccount();

  const { entries, addEntry, removeEntry } = useGuestbook(owner);

  const [message, setMessage] = useState("");
  const [stamp, setStamp] = useState<string>(GUESTBOOK_STAMPS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const text = message.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await addEntry(text, stamp);
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  /** 내가 지울 수 있는 방명록인지 — 방 주인이거나 내가 쓴 글 */
  const canDelete = (e: GuestbookEntry) =>
    isMyRoom || (!!myPhone && e.authorPhone === myPhone) || isMyNickname(e.authorNickname);

  return (
    <main className="relative flex flex-1 flex-col bg-holo-surface">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          {isMyRoom ? "내 방명록" : `${owner}님의 방명록`}
        </span>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-1">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <span className="text-[40px]">📭</span>
            <p className="mt-3 text-[14px] font-medium text-holo-ink-2">
              {isMyRoom
                ? "아직 받은 방명록이 없어요"
                : "첫 방명록을 남겨보세요"}
            </p>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              {isMyRoom
                ? "이웃이 놀러오면 여기에 흔적이 쌓여요"
                : "도장과 한 줄로 다녀간 흔적을 남겨요"}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <div className="relative shrink-0">
                  <img
                    src={getAvatarUrl(e.authorNickname)}
                    alt=""
                    className="h-9 w-9 rounded-full bg-holo-yellow-room object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 text-[14px]">
                    {e.stamp}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-holo-ink">
                      {e.authorNickname}
                    </span>
                    <span className="shrink-0 text-[11px] text-holo-ink-3">
                      {relativeTime(e.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 break-words text-[13px] leading-snug text-holo-ink-2">
                    {e.message}
                  </p>
                </div>
                {canDelete(e) && (
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => removeEntry(e.id)}
                    className="shrink-0 p-1 text-holo-ink-4 active:opacity-60"
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 작성 바 — 내 방에는 표시 안 함 */}
      {!isMyRoom && (
        <div className="absolute inset-x-0 bottom-0 border-t border-holo-line bg-white px-4 pb-4 pt-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            {GUESTBOOK_STAMPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStamp(s)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[16px] transition ${
                  stamp === s
                    ? "bg-holo-lilac-soft ring-2 ring-holo-purple-mid"
                    : "bg-holo-surface"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              maxLength={80}
              placeholder={`${owner}님께 한 줄 남기기`}
              className="h-11 flex-1 rounded-holo-pill border border-holo-line bg-holo-surface px-4 text-[14px] text-holo-ink placeholder:text-holo-ink-4 focus:outline-none focus:ring-2 focus:ring-holo-purple-mid"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="flex h-11 shrink-0 items-center justify-center rounded-holo-pill bg-holo-purple-mid px-5 text-[14px] font-semibold text-white disabled:bg-holo-ink-4"
            >
              남기기
            </button>
          </div>
        </div>
      )}
    </main>
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

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
