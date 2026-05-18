import { useNavigate } from "react-router-dom";
import { useAccountStats } from "@/shared/stores/account-stats-store";
import {
  getDailyRemaining,
  getLevelProgress,
  useXpState,
  XP_CONFIG,
  type XpAction,
} from "@/shared/stores/xp-store";

const LEVEL_MAX = 30;
// 레벨업 혜택 — 실제 앱 경제(포인트 / 가구 / 뱃지)에서 즉시 지급 가능한 항목만 사용.
// "프로필 테두리 해금" 같은 미구현 기능 대신 포인트·가구·뱃지로 구성.
const LEVEL_BENEFITS = [
  { level: 5,  label: "보너스 포인트 +100P" },
  { level: 10, label: "보너스 포인트 +300P" },
  { level: 15, label: "보너스 포인트 +500P" },
  { level: 20, label: "보너스 포인트 +1,000P" },
  { level: 25, label: "보너스 포인트 +2,000P" },
  { level: 30, label: "보너스 포인트 +5,000P" },
];

// 화면에 보여줄 액션 순서 — xp-store 의 VISIBLE_XP_ACTIONS 와 동일.
// "이웃 친구 추가(friend)" 는 노출에서 제외 (사용자 요청).
const ACTIVITY_ORDER: XpAction[] = [
  "post",
  "comment",
  "join",
  "attendance",
  "likeReceived",
];

export function MyLevelScreen() {
  const navigate = useNavigate();
  const stats = useAccountStats();
  // XP 변경을 구독해 진행도 / 잔여 횟수가 실시간 반영되게 한다.
  useXpState();
  // 현재 레벨(stats.level) 을 넘겨, 그 레벨에 맞는 요구치(LEVEL_XP_REQUIRED) 로 진행도를 계산.
  // 종전엔 모든 레벨 공통 500 XP 였는데 초반 진입 장벽이 높다는 피드백으로 레벨별 테이블로 교체됨.
  const { current: currentXp, required: nextLevelXp, percent: progress } =
    getLevelProgress(stats.level);

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
          <span className="text-[48px] font-bold leading-none">{stats.level}</span>
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
            const unlocked = stats.level >= b.level;
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
          {ACTIVITY_ORDER.map((action) => {
            const cfg = XP_CONFIG[action];
            const remaining = getDailyRemaining(action);
            const done = remaining === 0;
            // 회당 XP / 일 한도 / 총 가능 XP 를 명시적으로 안내해, "하루 N회 작성 시 X XP 까지 가능" 임이 분명히 보이게 한다.
            const dailyMax = cfg.xp * cfg.dailyLimit;
            return (
              <div
                key={action}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-[14px] text-holo-ink">{cfg.label}</span>
                  <span className="mt-0.5 text-[11px] text-holo-ink-3">
                    1회 +{cfg.xp} XP · 하루 최대 {cfg.dailyLimit}회 (총 {dailyMax} XP)
                  </span>
                  <span className="mt-0.5 text-[11px] text-holo-ink-3">
                    오늘 남은 횟수 {remaining}/{cfg.dailyLimit}
                    {done && " · 일일 한도 도달"}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-[13px] font-semibold ${
                    done ? "text-holo-ink-3" : "text-holo-purple-mid"
                  }`}
                >
                  +{cfg.xp} XP
                </span>
              </div>
            );
          })}
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
