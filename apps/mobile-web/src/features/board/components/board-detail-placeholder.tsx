import { useState } from "react";
import { useParams } from "react-router-dom";

const COMMENTS = [
  { id: "c1", author: "지영", time: "3분 전", body: "저 가까이 살아요! 카톡 주세요." },
  { id: "c2", author: "하늘", time: "12분 전", body: "사례 안 해주셔도 돼요 ㅎㅎ" },
  { id: "c3", author: "서준", time: "30분 전", body: "혹시 몇 시쯤 도착이에요?" },
];

export function BoardDetailPlaceholder() {
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col">
      <article className="flex flex-col gap-3 border-b border-gray-100 px-4 py-5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-holo-purple-light px-2 py-0.5 font-semibold text-holo-purple-deep">
            도와주세요
          </span>
          <span className="text-gray-400">역삼1동 · 5분 전</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">
          택배 잠시 맡아주실 분 계신가요?
        </h1>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-holo-purple-light" aria-hidden />
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-gray-900">민수</span>
            <span className="text-gray-400">Lv.2 · 가입 30일째</span>
          </div>
        </div>
        <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
          {`오후 3시쯤 도착 예정인데 5시까지 보관 부탁드려요.\n사례드립니다 :)\n\n게시글 #${id ?? "?"} (mock 데이터)`}
        </p>
        <div className="flex items-center gap-4 pt-1 text-xs text-gray-500">
          <button type="button" className="flex items-center gap-1">♥ 2</button>
          <span>💬 {COMMENTS.length}</span>
          <button type="button" className="ml-auto rounded-full bg-holo-purple-light px-3 py-1 font-semibold text-holo-purple-deep">
            채팅하기
          </button>
        </div>
      </article>

      <section className="flex flex-col gap-3 px-4 py-4">
        <h2 className="text-xs font-semibold text-gray-500">댓글 {COMMENTS.length}</h2>
        <ul className="flex flex-col gap-3">
          {COMMENTS.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" aria-hidden />
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="font-semibold text-gray-900">{c.author}</span>
                  <span>{c.time}</span>
                </div>
                <p className="text-sm text-gray-700">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setText("");
          alert("댓글 등록 (다음 단계에서 연결)");
        }}
        className="sticky bottom-0 flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글 입력"
          className="flex h-10 flex-1 items-center rounded-full bg-gray-100 px-4 text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="h-10 rounded-full bg-holo-gradient px-4 text-xs font-semibold text-white disabled:opacity-40"
        >
          등록
        </button>
      </form>
    </div>
  );
}
