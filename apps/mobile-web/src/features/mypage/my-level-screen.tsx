import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";

const LEVEL_MAX = 30;
const LEVEL_BENEFITS = [
  { level: 5,  label: "프로필 테두리 해금" },
  { level: 10, label: "특별 이모티콘 해금" },
  { level: 15, label: "칭호 슬롯 +1" },
  { level: 20, label: "뱃지 프레임 해금" },
  { level: 25, label: "HOLO 레전드 칭호" },
  { level: 30, label: "명예의 전당 등록" },
];

const LEVEL_ACTIVITIES = [
  { label: "게시글 작성", xp: "+10 XP" },
  { label: "댓글 작성", xp: "+5 XP" },
  { label: "모임 참여", xp: "+20 XP" },
  { label: "출석 체크", xp: "+3 XP" },
  { label: "이웃 친구 추가", xp: "+15 XP" },
  { label: "게시글 좋아요 받기", xp: "+2 XP" },
];

export function MyLevelScreen() {
  const navigate = useNavigate();
  const currentXp = 340;
  const nextLevelXp = 500;
  const progress = Math.round((currentXp / nextLevelXp) * 100);

  return (
    <main className="flex flex-1 flex-col overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">나의 레벨</span>
      </header>

      {/* 현재 레벨 카드 */}
      <section className="mx-4 mt-2 rounded-[16px] bg-holo-gradient p-5 text-white">
        <p className="text-[13px] font-medium opacity-80">현재 레벨</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[48px] font-bold leading-none">{ME.level}</span>
          <span className="mb-1 text-[18px] font-semibold opacity-70">/ {LEVEL_MAX}</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[12px] opacity-80">
            <span>경험치 {currentXp} XP</span>
            <span>다음 레벨까지 {nextLevelXp - currentXp} XP</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* 레벨업 혜택 */}
      <section className="mt-5 px-4">
        <p className="text-[14px] font-semibold text-holo-ink">레벨업 혜택</p>
        <div className="mt-3 flex flex-col gap-2">
          {LEVEL_BENEFITS.map((b) => {
            const unlocked = ME.level >= b.level;
            return (
              <div
                key={b.level}
                className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 ${
                  unlocked
                    ? "border-holo-purple-mid bg-holo-purple-mid/5"
                    : "border-holo-line bg-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    unlocked ? "bg-holo-purple-mid text-white" : "bg-holo-surface-2 text-holo-ink-3"
                  }`}
                >
                  {b.level}
                </span>
                <span
                  className={`text-[14px] ${unlocked ? "font-semibold text-holo-ink" : "text-holo-ink-3"}`}
                >
                  {b.label}
                </span>
                {unlocked && (
                  <span className="ml-auto text-[12px] font-semibold text-holo-purple-mid">획득 완료</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 경험치 획득 방법 */}
      <section className="mt-5 px-4">
        <p className="text-[14px] font-semibold text-holo-ink">경험치 획득 방법</p>
        <div className="mt-3 divide-y divide-holo-line rounded-[12px] border border-holo-line bg-white">
          {LEVEL_ACTIVITIES.map((a) => (
            <div key={a.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-holo-ink">{a.label}</span>
              <span className="text-[13px] font-semibold text-holo-purple-mid">{a.xp}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
