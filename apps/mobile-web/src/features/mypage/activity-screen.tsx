import { Link, useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";

export function ActivityScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col px-4 pb-4">
      <header className="flex h-12 shrink-0 items-center">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">내 활동</span>
      </header>

      <section className="flex justify-around rounded-holo-input bg-white py-4">
        <Stat label="내가 쓴 글" value={ME.postsCount} />
        <span className="h-10 w-px bg-holo-line" />
        <Stat label="내가 쓴 댓글" value={ME.commentsCount} />
        <span className="h-10 w-px bg-holo-line" />
        <Stat label="접속일수" value={ME.daysActive} />
      </section>

      <ul className="mt-3 flex flex-col text-[14px] text-holo-ink">
        <ListLink to="/mypage/posts">내가 쓴 글</ListLink>
        <ListLink to="/mypage/comments">내가 쓴 댓글</ListLink>
        <ListLink to="/mypage/recent">최근 본 글</ListLink>
      </ul>

      <Link
        to="/mypage/friends"
        className="mt-auto flex items-center gap-3 rounded-holo-card bg-holo-lilac-card-2 p-4"
      >
        <div className="flex flex-1 flex-col">
          <p className="text-[16px] font-semibold text-[#000000]">
            나와 닮은 이웃의
            <br />
            방으로 놀러가볼까요?
          </p>
          <p className="mt-1 text-[14px] font-normal text-holo-ink-3">
            게시판에서 다양한 사람들의
            <br />
            이야기를 만나보세요!
          </p>
          <span className="mt-6 self-start rounded-full bg-holo-purple-mid px-3 py-1 text-[12px] font-semibold text-white">
            이웃찾기 ›
          </span>
        </div>
        <span className="text-[28px]">📒</span>
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="text-[12px] text-holo-ink-3">{label}</span>
      <span className="mt-0.5 text-[18px] font-bold text-holo-ink">{value}</span>
    </div>
  );
}
function ListLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li className="border-b border-holo-line-3">
      <Link to={to} className="flex items-center justify-between py-3">
        <span>{children}</span>
        <ChevronRightIcon />
      </Link>
    </li>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
