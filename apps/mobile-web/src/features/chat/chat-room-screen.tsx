import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CHAT_MESSAGES, CHAT_MEMBERS } from "@/shared/mock/data";

export function ChatRoomScreen() {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col px-4 pt-3 pb-3">
      <article className="flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        <header className="flex items-center justify-between border-b border-holo-line px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
              <BackIcon />
            </button>
            <div>
              <p className="text-[15px] font-semibold text-holo-ink">다같이 러닝해요</p>
              <p className="text-[12px] text-holo-ink-3">샬랄라움밤바</p>
            </div>
          </div>
          <button type="button" aria-label="채팅방 정보" onClick={() => setShowInfo(true)}>
            <MenuIcon />
          </button>
        </header>

        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {CHAT_MESSAGES.map((m) =>
            m.mine ? (
              <li key={m.id} className="flex justify-end gap-2">
                <span className="self-end text-[10px] text-holo-ink-3">{m.time}</span>
                <span className="max-w-[70%] rounded-2xl bg-white px-3 py-2 text-[14px] text-holo-ink shadow-sm">
                  {m.content}
                </span>
              </li>
            ) : (
              <li key={m.id} className="flex items-start gap-2">
                <span className="h-9 w-9 shrink-0 rounded-full bg-holo-yellow-room" />
                <div className="flex flex-col">
                  <span className="text-[11px] text-holo-ink-3">{m.nickname}</span>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="max-w-[210px] rounded-2xl bg-white px-3 py-2 text-[14px] text-holo-ink shadow-sm">
                      {m.content}
                    </span>
                    <span className="text-[10px] text-holo-ink-3">{m.time}</span>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 border-t border-holo-line-3 px-3 py-2"
        >
          <input
            type="text"
            placeholder="댓글 작성하기"
            className="h-[34px] flex-1 rounded-full border border-holo-line-3 px-4 text-[13px] outline-none placeholder:text-holo-ink-3"
          />
          <button type="submit" aria-label="전송" className="text-holo-ink-4">
            <SendIcon />
          </button>
        </form>
      </article>

      {showInfo && (
        <ChatInfoModal
          onClose={() => setShowInfo(false)}
          onAddFriend={(nickname) => setShowAddFriend(nickname)}
        />
      )}

      {showAddFriend && (
        <ConfirmModal
          message={
            <>
              <strong>{showAddFriend}</strong>님을 친구로 추가하시겠습니까?
            </>
          }
          onYes={() => setShowAddFriend(null)}
          onNo={() => setShowAddFriend(null)}
        />
      )}
    </main>
  );
}

function ChatInfoModal({
  onClose,
  onAddFriend,
}: {
  onClose: () => void;
  onAddFriend: (nickname: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[330px] rounded-[15px] bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <span className="text-[16px] font-semibold text-holo-ink">다같이 러닝해요</span>
          <button type="button" aria-label="닫기" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[14px] font-semibold text-holo-ink">대화상대</span>
          <span className="text-[14px] text-holo-ink-2">{CHAT_MEMBERS.length}명</span>
        </div>

        <ul className="mt-3 flex flex-col gap-2 rounded-holo-card bg-holo-surface-2 p-4">
          {CHAT_MEMBERS.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-full bg-holo-yellow-room" />
              <span className="flex-1 text-[14px] text-holo-ink">{m.nickname}</span>
              {m.isMe && (
                <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">me</span>
              )}
              {m.isHost && <CrownIcon />}
              {!m.isMe && (
                <button
                  type="button"
                  aria-label="친구 추가"
                  onClick={() => onAddFriend(m.nickname)}
                  className="text-holo-purple-mid"
                >
                  <UserPlusIcon />
                </button>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-4 h-[44px] w-full rounded-full bg-holo-gradient text-[14px] font-semibold text-white"
        >
          초대하기
        </button>

        <div className="mt-3 flex items-center justify-around text-[13px] text-holo-ink">
          <button type="button">차단하기</button>
          <span className="h-3 w-px bg-holo-line" />
          <button type="button">신고하기</button>
          <span className="h-3 w-px bg-holo-line" />
          <button type="button">채팅방 나가기</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  message,
  onYes,
  onNo,
}: {
  message: React.ReactNode;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-[300px] overflow-hidden rounded-[12px] bg-white">
        <p className="px-4 py-5 text-center text-[14px] text-holo-ink">{message}</p>
        <div className="flex border-t border-holo-line">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 bg-holo-ink py-3 text-[14px] font-semibold text-white"
          >
            네
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 bg-holo-ink py-3 text-[14px] font-semibold text-white"
          >
            아니오
          </button>
        </div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFCB3B" stroke="#FFCB3B" strokeWidth="1" aria-hidden>
      <path d="m3 18 2-9 5 4 2-7 2 7 5-4 2 9z" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}
