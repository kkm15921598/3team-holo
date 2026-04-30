import { Link } from "react-router-dom";

const POSTS = [
  { id: "1", category: "도와주세요", title: "택배 잠시 맡아주실 분 계신가요?", author: "민수", time: "5분 전" },
  { id: "2", category: "자유", title: "동네에 새로 생긴 카페 가보신 분?", author: "지영", time: "1시간 전" },
  { id: "3", category: "모집", title: "주말 산책 같이 하실 분 모집해요", author: "하늘", time: "3시간 전" },
];

export function BoardScreen() {
  return (
    <ul className="flex flex-col divide-y divide-gray-100">
      {POSTS.map((p) => (
        <li key={p.id}>
          <Link to={`/board/${p.id}`} className="flex flex-col gap-1 px-4 py-4 active:bg-gray-50">
            <span className="text-xs font-medium text-holo-purple">{p.category}</span>
            <span className="text-sm font-semibold text-gray-900">{p.title}</span>
            <span className="text-xs text-gray-400">
              {p.author} · {p.time}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
