import { useState } from "react";
import {
  awardXp,
  getAttendanceCycleStatus,
  getAttendanceDayCount,
  useXpState,
} from "@/shared/stores/xp-store";
import { addPoints } from "@/features/myroom/myroom-store";
import { recordBadgeAcquired } from "@/shared/stores/account-stats-store";

/**
 * 매일 접속 시 뜨는 출석체크 팝업(간소화 버전).
 * 마이페이지 > 포인트 > 출석체크 와 동일한 출석 로직을 쓰되, 7일 보상을 작게 보여준다.
 *
 * 표시 규칙(shouldShowAttendancePopup):
 *  - 오늘 이미 출석했으면 안 뜸(완료 후 재접속 시 안 뜨게).
 *  - "오늘 하루 보지 않기" 체크하면 그날은 안 뜸.
 */

const SKIP_KEY = "holo:attendance-popup:skip"; // 값 = "오늘 보지 않기" 누른 날짜(YYYY-MM-DD)

// 한 세션에 한 번만 자동 노출 — 닫은 뒤 홈 재진입(컴포넌트 재마운트) 때 또 뜨지 않게.
let shownThisSession = false;
/** 홈에서 팝업을 띄우기로 결정하면 호출 — 이후 같은 세션 자동 재노출 차단. */
export function markAttendancePopupShown() {
  shownThisSession = true;
}

/** 주간 일차별 보상 — attendance-screen 의 WEEKLY_REWARDS 와 동일하게 유지. */
const WEEKLY_REWARDS: { points: number; label?: string }[] = [
  { points: 5 },
  { points: 5 },
  { points: 15, label: "연속" },
  { points: 5 },
  { points: 25, label: "연속" },
  { points: 5 },
  { points: 55, label: "스페셜" },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 오늘 팝업을 띄울지 — 이미 출석했거나 "오늘 보지 않기" 누른 날이면 false. */
export function shouldShowAttendancePopup(): boolean {
  if (typeof window === "undefined") return false;
  if (shownThisSession) return false; // 이번 세션에 이미 한 번 띄웠으면 자동 재노출 안 함
  try {
    if (window.localStorage.getItem(SKIP_KEY) === todayStr()) return false;
  } catch {
    // ignore
  }
  return !getAttendanceCycleStatus().attendedToday;
}

function skipToday() {
  try {
    window.localStorage.setItem(SKIP_KEY, todayStr());
  } catch {
    // ignore
  }
}

export function AttendancePopup({ onClose }: { onClose: () => void }) {
  const [skip, setSkip] = useState(false);
  // XP store 구독 — 출석 적립(awardXp) 후 store 가 emit 하면 재렌더되어 attendedToday 가
  // 즉시 반영된다(버튼이 '완료'로 전환). 종전 setTick 수동 갱신은 store 변경을 못 읽었다.
  useXpState();

  const cycle = getAttendanceCycleStatus();
  const attendedToday = cycle.attendedToday;
  const todayPoints = WEEKLY_REWARDS[cycle.todayPosition - 1]?.points ?? 5;

  const close = () => {
    if (skip) skipToday();
    onClose();
  };

  const handleCheck = () => {
    if (attendedToday) return;
    const result = awardXp("attendance");
    if (!result.capped) {
      addPoints(todayPoints, { title: "출석체크", note: `${cycle.todayPosition}일차` });
      if (getAttendanceDayCount() >= 365) recordBadgeAcquired("badge_26");
    }
    // useXpState 구독으로 즉시 '완료' 상태가 반영됨. 잠깐 보여주고 닫는다(오늘은 더 안 뜸).
    window.setTimeout(onClose, 900);
  };

  return (
    <>
      <div className="fixed inset-0 z-[1200] bg-black/40" onClick={close} aria-hidden />
      <div className="fixed inset-0 z-[1201] flex items-center justify-center px-7">
        <div className="relative w-full max-w-[300px] rounded-[20px] bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="absolute right-3 top-3 text-holo-ink-3 active:opacity-60"
          >
            <CloseIcon />
          </button>

          <p className="text-center text-[16px] font-bold text-holo-ink">출석체크</p>
          <p className="mt-1 text-center text-[12px] text-holo-ink-3">
            {attendedToday
              ? "오늘 출석 완료! 내일 또 만나요"
              : "매일 출석하고 포인트를 받아요"}
          </p>

          {/* 7일 보상 — 컴팩트 1행. 3·5·7일차(보너스/스페셜)는 포인트를 강조한다. */}
          <div className="mt-4 flex items-end justify-between">
            {cycle.days.map((d, i) => {
              const rw = WEEKLY_REWARDS[i] ?? { points: 5 };
              const isBonus = !!rw.label;
              const isSpecial = rw.label === "스페셜";
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  {/* 포인트 — 보너스일은 알약, 스페셜(7일차)은 그라데이션으로 시선 집중 */}
                  <span
                    className={
                      isSpecial
                        ? "rounded-full bg-holo-gradient-soft px-1.5 py-[2px] text-[10px] font-extrabold text-white shadow-[0_1px_4px_rgba(255,108,184,0.4)]"
                        : isBonus
                          ? "rounded-full bg-holo-lilac-card-2 px-1.5 py-[2px] text-[10px] font-extrabold text-holo-purple-mid"
                          : "text-[9px] font-semibold text-holo-ink-4"
                    }
                  >
                    {rw.points}P
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                      d.checked
                        ? "bg-holo-purple-mid text-white"
                        : d.isToday
                          ? "bg-white text-holo-purple-mid ring-2 ring-holo-purple-mid"
                          : isSpecial
                            ? "bg-white text-holo-pink ring-2 ring-holo-pink-soft"
                            : isBonus
                              ? "bg-holo-lilac-card-2 text-holo-purple-mid"
                              : "bg-holo-surface text-holo-ink-4"
                    }`}
                  >
                    {d.checked ? "✓" : d.day}
                  </span>
                  <span className="text-[8px] text-holo-ink-4">{d.day}일</span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleCheck}
            disabled={attendedToday}
            className={`mt-5 flex h-[46px] w-full items-center justify-center rounded-holo-pill text-[14px] font-bold ${
              attendedToday
                ? "bg-holo-surface text-holo-ink-4"
                : "bg-holo-purple-mid text-white active:opacity-90"
            }`}
          >
            {attendedToday ? "오늘 출석 완료 ✓" : `출석하고 +${todayPoints}P 받기`}
          </button>

          {/* 오늘 하루 보지 않기 */}
          <button
            type="button"
            onClick={() => setSkip((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[12px] text-holo-ink-3 active:opacity-70"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
                skip ? "border-holo-purple-mid bg-holo-purple-mid text-white" : "border-holo-line"
              }`}
            >
              {skip && <CheckTiny />}
            </span>
            오늘 하루 보지 않기
          </button>
        </div>
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}

function CheckTiny() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
