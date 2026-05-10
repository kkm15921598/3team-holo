import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ATTENDANCE_DAYS } from "@/shared/mock/data";

const TODAY = 4; // 오늘이 며칠차인지 (mock)
const STREAK = 3; // 연속 출석 일수 (mock)

export function AttendanceScreen() {
  const navigate = useNavigate();
  // 1~TODAY-1일차는 이미 적립, TODAY일차는 오늘 받을 수 있음
  const [claimed, setClaimed] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      Array.from({ length: TODAY - 1 }, (_, i) => [i + 1, true]),
    ),
  );
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const todayDef = useMemo(
    () => ATTENDANCE_DAYS.find((d) => d.day === TODAY),
    [],
  );
  const todayReward = todayDef?.reward ?? "5P";
  const todayClaimed = !!claimed[TODAY];

  const handleClaim = () => {
    if (todayClaimed) return;
    setClaimed((prev) => ({ ...prev, [TODAY]: true }));
    setShowSuccess(todayReward);
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-6">
      <header className="flex h-12 w-full items-center">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </header>
      <div className="flex flex-col items-center">
        <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
        <p className="mt-3 text-[16px] font-semibold text-holo-ink">출석체크</p>
        <p className="mt-1 text-[13px] text-holo-ink-3">
          매일 접속하고 포인트 모아보세요!
        </p>
      </div>

      {/* 연속 출석 배지 */}
      <div className="mt-4 flex items-center gap-2 rounded-full bg-holo-lilac-card-2 px-4 py-1.5 text-[13px] text-holo-purple-mid">
        <FlameIcon />
        <span className="font-semibold">
          연속 {STREAK + (todayClaimed ? 1 : 0)}일째 출석 중
        </span>
      </div>

      <div className="mt-5 grid w-full grid-cols-4 gap-3">
        {ATTENDANCE_DAYS.map((d) => {
          const isClaimed = !!claimed[d.day];
          const isToday = d.day === TODAY;
          const isFuture = d.day > TODAY;

          return (
            <div
              key={d.day}
              className={`relative flex aspect-[85/109] flex-col items-center justify-center rounded-[10px] text-center transition ${
                isToday && !isClaimed
                  ? "border-2 border-holo-purple-mid bg-white shadow-holo-card"
                  : isClaimed
                    ? "bg-holo-lilac-card-2"
                    : isFuture
                      ? "bg-white opacity-50 shadow-holo-card"
                      : "bg-white shadow-holo-card"
              }`}
            >
              {isClaimed ? (
                <>
                  <CheckBadge />
                  <p className="mt-1 text-[12px] font-semibold text-holo-purple-mid">
                    {d.allClear ? "ALL CLEAR" : `${d.day}일차`}
                  </p>
                  {d.reward && (
                    <p className="text-[12px] font-semibold text-holo-purple-mid">
                      {d.reward}
                    </p>
                  )}
                </>
              ) : d.allClear ? (
                <>
                  <p className="text-[14px] font-semibold text-holo-ink">ALL</p>
                  <p className="text-[14px] font-semibold text-holo-ink">CLEAR!</p>
                  <p className="mt-2 text-[14px] font-semibold text-holo-purple-text">
                    {d.reward}
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={`text-[14px] font-semibold ${
                      isToday ? "text-holo-purple-mid" : "text-holo-ink"
                    }`}
                  >
                    {d.day}일차
                  </p>
                  {d.illustration && <span className="mt-2 text-[24px]">🪑</span>}
                  {d.reward && (
                    <p className="mt-2 text-[14px] font-semibold text-holo-purple-text">
                      {d.reward}
                    </p>
                  )}
                  {isToday && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-holo-purple-mid px-2 py-0.5 text-[10px] font-semibold text-white">
                      오늘
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 self-start text-[11px] text-holo-ink-3">
        · 매일 자정(KST)에 출석 기록이 갱신돼요.
        <br />· 7일 연속 출석 시 보너스 1,500P를 드려요.
      </p>

      <button
        type="button"
        onClick={handleClaim}
        disabled={todayClaimed}
        className={`mt-auto h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
          todayClaimed ? "bg-holo-ink-4" : "bg-holo-ink"
        }`}
      >
        {todayClaimed ? "내일 다시 와주세요!" : `오늘의 ${todayReward} 받기`}
      </button>

      {showSuccess && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setShowSuccess(null)}
        >
          <div
            className="w-full max-w-[300px] rounded-[14px] bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-holo-lilac-card-2 text-[28px]">
              🎉
            </div>
            <p className="mt-3 text-[16px] font-bold text-holo-ink">
              출석 보상 획득!
            </p>
            <p className="mt-1 text-[20px] font-bold text-holo-purple-mid">
              +{showSuccess}
            </p>
            <p className="mt-2 text-[12px] text-holo-ink-3">
              내일도 와주시면 더 큰 보상이 기다려요.
            </p>
            <button
              type="button"
              onClick={() => setShowSuccess(null)}
              className="mt-4 h-10 w-full rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function CheckBadge() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-holo-purple-mid">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m4 12 6 6 10-14" />
      </svg>
    </span>
  );
}
function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#7448DD" aria-hidden>
      <path d="M12 2c1.5 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4-1 4 3 5 3-1 0-1.5 0-3 0-4z" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
