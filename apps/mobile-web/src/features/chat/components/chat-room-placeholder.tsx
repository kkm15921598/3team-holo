import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

type Msg = { id: string; from: "me" | "them"; body: string; time: string };

const INITIAL_MESSAGES: Msg[] = [
  { id: "1", from: "them", body: "안녕하세요! 게시글 보고 연락드려요", time: "오후 2:14" },
  { id: "2", from: "me", body: "네 안녕하세요 :)", time: "오후 2:15" },
  { id: "3", from: "them", body: "혹시 오늘도 가능하세요?", time: "오후 2:15" },
  { id: "4", from: "me", body: "네 가능합니다! 5시 이후 아무때나 괜찮아요", time: "오후 2:16" },
  { id: "5", from: "them", body: "감사합니다 그럼 6시쯤 갈게요", time: "오후 2:17" },
];

export function ChatRoomPlaceholder() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [text, setText] = useState("");

  const handleSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: String(prev.length + 1), from: "me", body: trimmed, time: "방금" },
    ]);
    setText("");
  };

  return (
    <div className="flex h-full flex-col bg-[#F7F7FB]">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 text-[11px] text-gray-500">
        채팅방 #{id} · 역삼1동
      </div>

      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`flex items-end gap-1.5 ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            {m.from === "me" && (
              <span className="text-[10px] text-gray-400">{m.time}</span>
            )}
            <p
              className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                m.from === "me"
                  ? "bg-holo-purple text-white"
                  : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100"
              }`}
            >
              {m.body}
            </p>
            {m.from === "them" && (
              <span className="text-[10px] text-gray-400">{m.time}</span>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지 입력"
          className="flex h-10 flex-1 items-center rounded-full bg-gray-100 px-4 text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="전송"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-holo-gradient text-white disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 11 21 3l-8 18-2-7-8-3z" />
    </svg>
  );
}
