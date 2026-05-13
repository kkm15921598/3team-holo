import { useNavigate } from "react-router-dom";

const OTHER_USER = {
  nickname: "샬랄라 움밤바",
  level: 12,
  title: "#미식가",
  badgeIcon: "🍩",
  postsCount: 10,
  commentsCount: 24,
  daysActive: 12,
};

export function ProfileDetailScreen() {
  const navigate = useNavigate();
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden rounded-b-[28px] bg-holo-hero pb-12">
        <button
          type="button"
          aria-label="닫기"
          onClick={() => navigate(-1)}
          className="absolute right-4 top-4 z-10 text-holo-ink"
        >
          <CloseIcon />
        </button>
        <img
          src="/illustrations/home-hero.png"
          alt=""
          className="h-[260px] w-full object-cover"
          aria-hidden
        />
      </section>

      <section className="-mt-12 flex flex-col items-center px-4">
        <span className="h-[88px] w-[88px] rounded-full border-4 border-white bg-holo-yellow-room" />
        <span className="mt-3 rounded-[4px] bg-holo-gradient-soft px-2 py-0.5 text-[12px] font-semibold text-white">
          Lv.{OTHER_USER.level}
        </span>
        <p className="mt-2 text-[20px] font-semibold text-holo-ink">{OTHER_USER.nickname}</p>
        <p className="mt-1 text-[14px] text-holo-ink-2">
          {OTHER_USER.title} <span>{OTHER_USER.badgeIcon}</span>
        </p>

        <div className="mt-6 flex w-full items-center justify-around">
          <Stat label="게시글" value={OTHER_USER.postsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="댓글" value={OTHER_USER.commentsCount} />
          <span className="h-8 w-px bg-holo-line" />
          <Stat label="접속일수" value={OTHER_USER.daysActive} />
        </div>

        <button
          type="button"
          className="mt-7 flex h-[50px] w-full items-center justify-center gap-2 rounded-holo-pill bg-holo-purple-mid text-[15px] font-semibold text-white"
        >
          <UserPlusIcon /> 친구추가
        </button>

        <div className="mt-6 flex w-full items-center justify-around text-[14px] text-holo-ink-3">
          <button type="button" className="flex items-center gap-1">
            <BlockIcon /> 차단하기
          </button>
          <button type="button" className="flex items-center gap-1">
            <FlagIcon /> 신고하기
          </button>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[12px] text-holo-ink-2">{label}</span>
      <span className="mt-1 text-[20px] font-black text-holo-purple-mid">{value}</span>
    </div>
  );
}
function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3.6-7 7-7s7 3 7 7" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 21V4l14 4-7 3 7 4z" />
    </svg>
  );
}
