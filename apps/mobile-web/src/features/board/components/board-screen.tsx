import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Category = "전체" | "자유" | "도와주세요" | "모집";

type Post = {
  id: string;
  category: Exclude<Category, "전체">;
  title: string;
  preview: string;
  author: string;
  neighborhood: string;
  time: string;
  likes: number;
  comments: number;
};

const POSTS: Post[] = [
  {
    id: "1",
    category: "도와주세요",
    title: "택배 잠시 맡아주실 분 계신가요?",
    preview: "오후 3시쯤 도착 예정인데 5시까지 보관 부탁드려요. 사례드립니다 :)",
    author: "민수",
    neighborhood: "역삼1동",
    time: "5분 전",
    likes: 2,
    comments: 4,
  },
  {
    id: "2",
    category: "자유",
    title: "동네에 새로 생긴 카페 가보신 분?",
    preview: "역삼역 3번 출구쪽에 새로 오픈한 카페 있던데 후기 궁금해요!",
    author: "지영",
    neighborhood: "역삼1동",
    time: "1시간 전",
    likes: 12,
    comments: 8,
  },
  {
    id: "3",
    category: "모집",
    title: "주말 산책 같이 하실 분 모집해요",
    preview: "토요일 아침 한강공원 산책 1~2명 같이 가실 분! 30대 환영",
    author: "하늘",
    neighborhood: "삼성동",
    time: "3시간 전",
    likes: 7,
    comments: 3,
  },
  {
    id: "4",
    category: "자유",
    title: "이 동네 추천 맛집 있나요?",
    preview: "이사 온 지 일주일째인데 아직 단골집을 못 찾았어요...",
    author: "서준",
    neighborhood: "역삼2동",
    time: "어제",
    likes: 23,
    comments: 17,
  },
  {
    id: "5",
    category: "도와주세요",
    title: "공구 잠깐 빌려주실 수 있나요?",
    preview: "전동드릴 30분만 사용하면 됩니다. 사례 드릴게요.",
    author: "예린",
    neighborhood: "역삼1동",
    time: "2일 전",
    likes: 4,
    comments: 6,
  },
];

const CATEGORIES: Category[] = ["전체", "자유", "도와주세요", "모집"];

export function BoardScreen() {
  const [active, setActive] = useState<Category>("전체");

  const filtered = useMemo(
    () => (active === "전체" ? POSTS : POSTS.filter((p) => p.category === active)),
    [active],
  );

  return (
    <div className="relative flex flex-col">
      <div className="sticky top-0 z-[1] flex gap-2 overflow-x-auto bg-white px-4 py-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active === c
                ? "bg-holo-purple text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-gray-100">
        {filtered.map((p) => (
          <li key={p.id}>
            <Link to={`/board/${p.id}`} className="flex flex-col gap-1.5 px-4 py-4 active:bg-gray-50">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-holo-purple-light px-2 py-0.5 font-semibold text-holo-purple-deep">
                  {p.category}
                </span>
                <span className="text-gray-400">{p.neighborhood}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{p.title}</h3>
              <p className="line-clamp-2 text-xs text-gray-500">{p.preview}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                <span>{p.author}</span>
                <span>·</span>
                <span>{p.time}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span>♥ {p.likes}</span>
                  <span>💬 {p.comments}</span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => alert("글쓰기 (다음 단계에서 연결)")}
        aria-label="글쓰기"
        className="fixed bottom-20 right-[max(1rem,calc(50%-210px+1rem))] z-[2] flex h-14 w-14 items-center justify-center rounded-full bg-holo-gradient text-white shadow-lg active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
