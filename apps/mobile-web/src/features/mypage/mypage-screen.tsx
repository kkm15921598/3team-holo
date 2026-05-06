import { Link } from "react-router-dom";
import { ME } from "@/shared/mock/data";

export function MypageScreen() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-4">
      {/* Profile card */}
      <section className="rounded-holo-card bg-holo-lilac-card-2 p-4">
        <div className="flex items-center gap-3">
          <span className="h-14 w-14 rounded-full bg-holo-yellow-room" />
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold text-holo-ink">{ME.nickname}</span>
              <span>{ME.badgeIcon}</span>
            </div>
            <span className="text-[12px] text-holo-ink-3">{ME.title}</span>
          </div>
          <Link to="/mypage/edit" aria-label="프로필 편집">
            <EditIcon />
          </Link>
        </div>
      </section>

      {/* Points */}
      <Link
        to="/mypage/points"
        className="flex items-center justify-between rounded-holo-input bg-holo-purple-mid px-4 py-3 text-white"
      >
        <span className="text-[14px] font-semibold">나의 포인트</span>
        <span className="text-[16px] font-bold">{ME.points}P</span>
      </Link>

      {/* Stats */}
      <section className="flex justify-around rounded-holo-input bg-white p-3">
        <Stat label="나의 레벨" value={ME.level} />
        <span className="h-10 w-px bg-holo-line" />
        <Stat label="나의 뱃지" value={12} />
        <span className="h-10 w-px bg-holo-line" />
        <Stat label="나의 칭호" value={22} />
        <span className="h-10 w-px bg-holo-line" />
        <Stat label="모임 참여" value={8} />
      </section>

      {/* Region verify */}
      <section className="flex items-center justify-between rounded-holo-input border border-holo-line bg-white px-4 py-3">
        <span className="flex items-center gap-2 text-[14px] text-holo-ink">
          <PinIcon /> {ME.region}
        </span>
        <button
          type="button"
          className="rounded-full bg-holo-purple-mid px-3 py-1 text-[13px] font-semibold text-white"
        >
          인증하기
        </button>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-2">
        <Quick to="/mypage/activity" label="내 활동" icon={<NoteIcon />} />
        <Quick to="/mypage/likes" label="좋아요" icon={<HeartIcon />} />
        <Quick to="/mypage/friends" label="내 친구" icon={<PeopleIcon />} />
      </section>

      {/* Settings */}
      <section className="mt-2">
        <p className="text-[15px] font-semibold text-holo-ink">설정</p>
        <ul className="mt-3 flex flex-col divide-y divide-holo-line-3 text-[14px] text-holo-ink-2">
          {["계정관리", "개인정보", "알림설정", "모드설정하기", "로그아웃"].map((s) => (
            <li key={s}>
              <button type="button" className="flex w-full items-center justify-between py-3 text-left">
                {s}
              </button>
            </li>
          ))}
        </ul>
      </section>
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
function Quick({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex h-[80px] flex-col items-center justify-center gap-2 rounded-holo-input bg-white shadow-holo-card"
    >
      <span className="text-holo-purple-mid">{icon}</span>
      <span className="text-[13px] text-holo-ink">{label}</span>
    </Link>
  );
}
function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 3 4 4-12 12H5v-4z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#7448DD" stroke="#7448DD" strokeWidth="1" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6M14 14c2.5 0 7 1.5 7 5" />
    </svg>
  );
}
