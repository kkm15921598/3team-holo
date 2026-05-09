import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CHAT_MEMBERS,
  CHAT_MESSAGES,
  CHAT_QUICK_EMOJIS,
  type ChatMessage,
  type ChatMessageReaction,
} from "@/shared/mock/data";

type ReplyTarget = { nickname: string; content: string } | null;

export function ChatRoomScreen() {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<ReplyTarget>(null);
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLUListElement>(null);

  // 새 메시지 시 하단 스크롤
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // typing 가짜 인디케이터 (3초 후 자동 OFF)
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), 3000);
    return () => clearTimeout(t);
  }, [typing]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        nickname: "",
        content: v,
        time,
        mine: true,
        replyTo: reply ?? undefined,
        read: false,
        readBy: 1,
      },
    ]);
    setText("");
    setReply(null);
    // 가짜 답장 인디케이터
    setTimeout(() => setTyping(true), 600);
  };

  const addReaction = (id: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const list = [...(m.reactions ?? [])];
        const existing = list.find((r) => r.emoji === emoji);
        if (existing) {
          existing.count += existing.mine ? -1 : 1;
          existing.mine = !existing.mine;
          if (existing.count <= 0) {
            return { ...m, reactions: list.filter((r) => r !== existing) };
          }
        } else {
          list.push({ emoji, count: 1, mine: true });
        }
        return { ...m, reactions: list };
      }),
    );
    setReactionTarget(null);
  };

  // 그룹화: 날짜 구분선
  const grouped = useMemo(() => {
    const out: Array<{ kind: "date" | "msg"; data: any }> = [];
    let prev: string | undefined;
    messages.forEach((m) => {
      if (m.date && m.date !== prev) {
        out.push({ kind: "date", data: m.date });
        prev = m.date;
      }
      out.push({ kind: "msg", data: m });
    });
    return out;
  }, [messages]);

  const onAttachPick = (kind: string) => {
    setShowAttach(false);
    if (kind === "image") {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          nickname: "",
          content: "",
          time,
          mine: true,
          type: "image",
          imageUrl: "https://picsum.photos/seed/holo/400/280",
          read: false,
          readBy: 1,
        },
      ]);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-4 pt-3 pb-3">
      <article className="flex flex-1 flex-col rounded-holo-card bg-white shadow-holo-card">
        <header className="flex items-center justify-between border-b border-holo-line px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
              <BackIcon />
            </button>
            <div className="relative">
              <span className="block h-9 w-9 rounded-full bg-holo-yellow-room" />
              <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-holo-ink">다같이 러닝해요</p>
              <p className="text-[11px] text-holo-ink-3">멤버 {CHAT_MEMBERS.length}명 · 활동 중</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="검색" className="text-holo-ink-3">
              <SearchSmallIcon />
            </button>
            <button type="button" aria-label="채팅방 정보" onClick={() => setShowInfo(true)}>
              <MenuIcon />
            </button>
          </div>
        </header>

        <ul
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
          onClick={() => {
            setReactionTarget(null);
          }}
        >
          {grouped.map((row, i) => {
            if (row.kind === "date") {
              return <DateDivider key={`d-${i}`} dateStr={row.data} />;
            }
            const m = row.data as ChatMessage;
            if (m.type === "system") {
              return (
                <li key={m.id} className="flex justify-center">
                  <span className="rounded-full bg-holo-surface-2 px-3 py-1 text-[11px] text-holo-ink-3">
                    {m.content}
                  </span>
                </li>
              );
            }
            return (
              <MessageItem
                key={m.id}
                message={m}
                onLongPress={(target) => setActionTarget(target)}
                onReact={() => setReactionTarget(m.id)}
                showReactionPicker={reactionTarget === m.id}
                onPickEmoji={(e) => addReaction(m.id, e)}
              />
            );
          })}

          {typing && (
            <li className="flex items-end gap-2">
              <span className="h-9 w-9 shrink-0 rounded-full bg-holo-yellow-room" />
              <div className="flex items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-sm">
                <Dot />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            </li>
          )}
        </ul>

        {/* 답장 미리보기 */}
        {reply && (
          <div className="flex items-start gap-2 border-t border-holo-line-3 bg-holo-surface-2 px-3 py-2">
            <div className="w-1 self-stretch rounded bg-holo-purple-mid" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-semibold text-holo-purple-mid">
                {reply.nickname}님에게 답장
              </p>
              <p className="truncate text-[12px] text-holo-ink-3">{reply.content}</p>
            </div>
            <button type="button" aria-label="답장 취소" onClick={() => setReply(null)}>
              <CloseIcon />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-holo-line-3 px-3 py-2"
        >
          <button
            type="button"
            aria-label="첨부"
            onClick={() => {
              setShowAttach((v) => !v);
              setShowEmoji(false);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              showAttach ? "bg-holo-purple-mid text-white" : "text-holo-ink-3"
            }`}
          >
            <PlusIcon />
          </button>
          <div className="flex flex-1 items-center gap-1 rounded-full border border-holo-line-3 px-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메시지를 입력하세요"
              className="h-[34px] flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-holo-ink-3"
            />
            <button
              type="button"
              aria-label="이모지"
              onClick={() => {
                setShowEmoji((v) => !v);
                setShowAttach(false);
              }}
              className="text-[16px]"
            >
              😊
            </button>
          </div>
          <button
            type="submit"
            aria-label="전송"
            disabled={!text.trim()}
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              text.trim()
                ? "bg-holo-gradient text-white"
                : "bg-holo-line-3 text-white"
            }`}
          >
            <SendIcon />
          </button>
        </form>

        {/* 첨부 패널 */}
        {showAttach && (
          <div className="grid grid-cols-4 gap-3 border-t border-holo-line-3 bg-holo-surface-2 px-4 py-3">
            <AttachItem icon="📷" label="카메라" onClick={() => onAttachPick("camera")} />
            <AttachItem icon="🖼️" label="앨범" onClick={() => onAttachPick("image")} />
            <AttachItem icon="📎" label="파일" onClick={() => onAttachPick("file")} />
            <AttachItem icon="📍" label="위치" onClick={() => onAttachPick("location")} />
            <AttachItem icon="🎤" label="음성" onClick={() => onAttachPick("voice")} />
            <AttachItem icon="📊" label="투표" onClick={() => onAttachPick("poll")} />
            <AttachItem icon="💸" label="송금" onClick={() => onAttachPick("pay")} />
            <AttachItem icon="📅" label="일정" onClick={() => onAttachPick("event")} />
          </div>
        )}

        {/* 이모지 picker */}
        {showEmoji && (
          <div className="border-t border-holo-line-3 bg-white px-3 py-2">
            <div className="grid grid-cols-8 gap-1">
              {[
                "😀","😁","😂","🤣","😊","😍","🥰","😎",
                "🤩","🤔","😴","😭","😡","🥳","🤗","🙌",
                "👍","👏","🙏","💪","🔥","💯","❤️","💜",
              ].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setText((t) => t + e)}
                  className="h-8 text-[20px]"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
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

      {actionTarget && (
        <MessageActionSheet
          target={actionTarget}
          onClose={() => setActionTarget(null)}
          onReply={() => {
            setReply({
              nickname: actionTarget.mine ? "나" : actionTarget.nickname || "상대",
              content: actionTarget.content || "[이미지]",
            });
            setActionTarget(null);
          }}
          onCopy={() => {
            navigator.clipboard?.writeText(actionTarget.content || "").catch(() => {});
            setActionTarget(null);
          }}
          onReact={(e) => {
            addReaction(actionTarget.id, e);
            setActionTarget(null);
          }}
        />
      )}
    </main>
  );
}

function MessageItem({
  message,
  onLongPress,
  onReact,
  showReactionPicker,
  onPickEmoji,
}: {
  message: ChatMessage;
  onLongPress: (m: ChatMessage) => void;
  onReact: () => void;
  showReactionPicker: boolean;
  onPickEmoji: (e: string) => void;
}) {
  const longPressTimer = useRef<number | null>(null);
  const startPress = () => {
    longPressTimer.current = window.setTimeout(() => onLongPress(message), 450);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const bubbleBase =
    "max-w-[230px] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[14px] shadow-sm";

  const reactions = message.reactions ?? [];

  if (message.mine) {
    return (
      <li className="flex flex-col items-end gap-1">
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-holo-ink-3">
              {message.read ? "읽음" : message.readBy ? `안 읽음 ${message.readBy}` : ""}
            </span>
            <span className="text-[10px] text-holo-ink-3">{message.time}</span>
          </div>
          <div className="relative">
            {message.replyTo && <ReplyPreview reply={message.replyTo} />}
            {message.type === "image" && message.imageUrl ? (
              <img
                src={message.imageUrl}
                alt=""
                className="max-w-[230px] rounded-2xl"
                onMouseDown={startPress}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onTouchStart={startPress}
                onTouchEnd={cancelPress}
              />
            ) : (
              <span
                className={`${bubbleBase} bg-holo-lilac-deep text-holo-ink`}
                onMouseDown={startPress}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onTouchStart={startPress}
                onTouchEnd={cancelPress}
                onDoubleClick={onReact}
              >
                {message.content}
              </span>
            )}
            {showReactionPicker && <ReactionPicker onPick={onPickEmoji} />}
          </div>
        </div>
        {reactions.length > 0 && (
          <ReactionList reactions={reactions} onClick={onReact} align="end" />
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-col items-start gap-1">
      <div className="flex items-start gap-2">
        <span className="h-9 w-9 shrink-0 rounded-full bg-holo-yellow-room" />
        <div className="flex flex-col">
          <span className="text-[11px] text-holo-ink-3">{message.nickname}</span>
          <div className="mt-1 flex items-end gap-2">
            <div className="relative">
              {message.replyTo && <ReplyPreview reply={message.replyTo} />}
              {message.type === "image" && message.imageUrl ? (
                <img
                  src={message.imageUrl}
                  alt=""
                  className="max-w-[210px] rounded-2xl"
                  onMouseDown={startPress}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={startPress}
                  onTouchEnd={cancelPress}
                />
              ) : (
                <span
                  className={`${bubbleBase} bg-white text-holo-ink`}
                  onMouseDown={startPress}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={startPress}
                  onTouchEnd={cancelPress}
                  onDoubleClick={onReact}
                >
                  {message.content}
                </span>
              )}
              {showReactionPicker && <ReactionPicker onPick={onPickEmoji} />}
            </div>
            <span className="text-[10px] text-holo-ink-3">{message.time}</span>
          </div>
        </div>
      </div>
      {reactions.length > 0 && (
        <ReactionList reactions={reactions} onClick={onReact} align="start" />
      )}
    </li>
  );
}

function ReplyPreview({ reply }: { reply: { nickname: string; content: string } }) {
  return (
    <div className="mb-1 flex items-start gap-1.5 rounded-lg bg-holo-surface-2 px-2 py-1">
      <span className="w-0.5 self-stretch rounded bg-holo-purple-mid" />
      <div className="overflow-hidden">
        <p className="text-[10px] font-semibold text-holo-purple-mid">{reply.nickname}</p>
        <p className="truncate text-[11px] text-holo-ink-3">{reply.content}</p>
      </div>
    </div>
  );
}

function ReactionPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div
      className="absolute -top-9 left-0 z-10 flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      {CHAT_QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className="text-[16px] hover:scale-125"
          onClick={() => onPick(e)}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function ReactionList({
  reactions,
  onClick,
  align,
}: {
  reactions: ChatMessageReaction[];
  onClick: () => void;
  align: "start" | "end";
}) {
  return (
    <div
      className={`flex flex-wrap gap-1 ${align === "end" ? "justify-end" : "justify-start"} ${
        align === "start" ? "ml-11" : ""
      }`}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={onClick}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${
            r.mine
              ? "border-holo-purple-mid bg-holo-lilac-soft text-holo-purple-mid"
              : "border-holo-line bg-white text-holo-ink-2"
          }`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}

function DateDivider({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  return (
    <li className="flex justify-center">
      <span className="rounded-full bg-holo-surface-2 px-3 py-1 text-[11px] text-holo-ink-3">
        {label}
      </span>
    </li>
  );
}

function Dot({ delay }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-holo-ink-3"
      style={{ animationDelay: delay }}
    />
  );
}

function AttachItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[22px] shadow-sm">
        {icon}
      </span>
      <span className="text-[11px] text-holo-ink-2">{label}</span>
    </button>
  );
}

function MessageActionSheet({
  target,
  onClose,
  onReply,
  onCopy,
  onReact,
}: {
  target: ChatMessage;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onReact: (e: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[400px] rounded-t-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded bg-holo-line-3" />
        <div className="mb-3 flex justify-between">
          {CHAT_QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="text-[24px]"
              onClick={() => onReact(e)}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-holo-line">
          <SheetItem onClick={onReply}>답장하기</SheetItem>
          <SheetItem onClick={onCopy}>복사하기</SheetItem>
          <SheetItem onClick={onClose}>전달하기</SheetItem>
          <SheetItem onClick={onClose}>저장하기</SheetItem>
          {!target.mine && <SheetItem onClick={onClose} danger>신고하기</SheetItem>}
          {target.mine && <SheetItem onClick={onClose} danger>삭제하기</SheetItem>}
        </div>
      </div>
    </div>
  );
}

function SheetItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 text-left text-[14px] ${danger ? "text-red-500" : "text-holo-ink"}`}
    >
      {children}
    </button>
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

        <ul className="mt-3 flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-holo-card bg-holo-surface-2 p-4">
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <QuickAction icon="🔕" label="알림" />
          <QuickAction icon="📌" label="고정" />
          <QuickAction icon="🖼️" label="미디어" />
        </div>

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

function QuickAction({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1 rounded-[10px] bg-holo-surface-2 py-2"
    >
      <span className="text-[18px]">{icon}</span>
      <span className="text-[11px] text-holo-ink-2">{label}</span>
    </button>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-8z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SearchSmallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
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
