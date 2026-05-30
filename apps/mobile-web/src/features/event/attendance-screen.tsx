import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  awardXp,
  getAttendanceCycleStatus,
  getAttendanceDayCount,
} from "@/shared/stores/xp-store";
import { addPoints } from "@/features/myroom/myroom-store";
import { recordBadgeAcquired } from "@/shared/stores/account-stats-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";

/**
 * "이번 사이클(=현재 ISO 주) 식별 키" — 보너스 출석을 사이클당 1회로 제한할 때 사용.
 * 주가 바뀌면 자동으로 새 사이클로 인식되어 다시 사용 가능해진다.
 */
function currentCycleKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const dayOfYear = Math.floor(
    (now.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.ceil((dayOfYear + firstDay.getDay() + 1) / 7);
  return `${year}-W${week}`;
}

const BONUS_STORAGE_KEY = "holo:attendance-bonus";
/** 보너스 출석 보상 포인트. */
const BONUS_POINTS = 5;

/** 주간 일차별 보상 — 1~7일차의 포인트 / 보너스 라벨. */
const WEEKLY_REWARDS: { points: number; label?: string }[] = [
  { points: 5 },
  { points: 5 },
  { points: 15, label: "연속보너스" },
  { points: 5 },
  { points: 25, label: "연속보너스" },
  { points: 5 },
  { points: 55, label: "스페셜" },
];

type Day = {
  day: number; // 1~7
  points: number;
  checked: boolean;
  isToday: boolean;
  label?: string;
};

export function AttendanceScreen() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  // 매 렌더마다 최신 상태를 새로 계산 — 출석 직후 화면이 즉시 갱신됨
  const [refreshTick, setRefreshTick] = useState(0);

  // 보너스 출석 상태 — 이번 사이클(주) 내에서 사용했는지 여부 + 모달 노출 제어
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusUsed, setBonusUsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(BONUS_STORAGE_KEY) === currentCycleKey();
    } catch {
      return false;
    }
  });

  const cycle = getAttendanceCycleStatus();
  const attendanceDays: Day[] = cycle.days.map((r, i) => ({
    day: r.day,
    points: WEEKLY_REWARDS[i].points,
    label: WEEKLY_REWARDS[i].label,
    checked: r.checked,
    isToday: r.isToday,
  }));
  const todayDay = attendanceDays.find((d) => d.isToday);
  const checkedCount = attendanceDays.filter((d) => d.checked).length;
  const alreadyCheckedToday = todayDay?.checked ?? false;

  const handleAttendance = () => {
    const result = awardXp("attendance");
    if (result.capped) {
      setToast("오늘은 이미 출석했어요");
    } else {
      const pts = todayDay?.points ?? 5;
      addPoints(pts, {
        title: "출석체크",
        note: todayDay
          ? `${todayDay.day}일차${todayDay.label ? ` · ${todayDay.label}` : ""}`
          : undefined,
      });
      // 출석일 누적 365일 달성 → "1년째 입주민" 뱃지 자동 발급
      if (getAttendanceDayCount() >= 365) {
        const newlyAcquired = recordBadgeAcquired("badge_26");
        if (newlyAcquired) {
          setToast("🎉 '1년째 입주민' 뱃지를 획득했어요!");
          window.setTimeout(() => setToast(null), 2400);
          // 조기 return 으로 아래 공통 setRefreshTick 을 건너뛰면 오늘 출석 카드/CTA 가
          // 갱신되지 않으므로 여기서 직접 갱신한다.
          setRefreshTick((t) => t + 1);
          return;
        }
      }
      setToast(`출석 완료! +${result.gained} XP · +${pts}P`);
    }
    setRefreshTick((t) => t + 1);
    window.setTimeout(() => setToast(null), 1800);
  };
  void refreshTick;

  /**
   * 보너스 출석 — 광고 시청을 가정하고 보너스 포인트 지급.
   * 한 사이클에 1회만 가능하며, 사용 후엔 localStorage 의 사이클 키로 잠긴다.
   * 다음 주(=새 cycleKey) 가 되면 자동으로 다시 열린다.
   */
  const handleClaimBonus = () => {
    if (bonusUsed) return;
    addPoints(BONUS_POINTS, {
      title: "보너스 출석",
      note: "광고 시청",
    });
    try {
      window.localStorage.setItem(BONUS_STORAGE_KEY, currentCycleKey());
    } catch {
      // best-effort
    }
    setBonusUsed(true);
    setShowBonusModal(false);
    setToast(`보너스 출석 완료! +${BONUS_POINTS}P`);
    window.setTimeout(() => setToast(null), 1800);
  };

  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-white pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* 헤더 — 다른 마이페이지 하위 화면들과 동일한 패턴: 뒤로가기 + 좌측 타이틀 */}
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          출석체크
        </span>
      </header>

      {/* 히어로 카드 — 진한 보라 그라데이션. 라벨+숫자 한 줄 + progress bar 만 남긴 컴팩트 버전.
          연속 출석 안내는 streak > 0 일 때만 인라인으로 살짝 노출. */}
      <section className="relative mx-4 mt-3 overflow-hidden rounded-[16px] bg-gradient-to-br from-holo-purple-mid to-holo-purple-deep px-4 py-3 shadow-[0_8px_20px_rgba(84,43,180,0.25)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-medium text-white/85">
                이번 주 출석
              </span>
              <span className="ml-1 text-[20px] font-extrabold leading-none text-white">
                {checkedCount}
              </span>
              <span className="text-[12px] font-semibold text-white/75">
                / 7일
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {attendanceDays.map((d) => (
                <span
                  key={d.day}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    d.checked
                      ? "bg-white"
                      : d.isToday
                        ? "bg-white/50"
                        : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>
          <CalendarIllustration />
        </div>
      </section>

      {/* 일별 카드 — 2 × 4 그리드. 8번째 자리는 보너스 출석 슬롯으로 활용. */}
      <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
        {attendanceDays.map((d) => (
          <DayCardSlot key={d.day} day={d} />
        ))}
        <BonusSlot
          used={bonusUsed}
          onClick={() => setShowBonusModal(true)}
        />
      </div>

      {/* 출석 안내 — 박스 없이 본문만. 페이지 흐름 안에 자연스럽게 텍스트만 표시. */}
      <section className="mx-4 mt-[31px] px-1">
        <div className="flex items-center gap-2">
          <InfoBadge />
          <p className="text-[14px] font-bold text-holo-ink">출석 안내</p>
        </div>
        <ul className="mt-2 space-y-1 pl-[10px] text-[12px] text-holo-ink-3">
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-holo-purple-mid" />
            매일 출석 시 최소 5P를 받아요
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-holo-purple-mid" />
            3·5·7일차에 연속 출석 보너스를 추가로 받아요
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-holo-purple-mid" />
            연속 출석이 끊기면 다시 1일차부터 시작해요
          </li>
        </ul>
      </section>

      {/* CTA 버튼 — 검은 배경 (홀로 ink) */}
      <div className="mt-8 px-4">
        <button
          type="button"
          onClick={handleAttendance}
          disabled={alreadyCheckedToday}
          className={`h-[56px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            alreadyCheckedToday ? "bg-holo-ink-4" : "bg-holo-ink"
          }`}
        >
          {alreadyCheckedToday
            ? "오늘은 이미 출석했어요"
            : `오늘 출석하고 ${todayDay?.points ?? 5}P 받기`}
        </button>
      </div>

      {/* 보너스 출석 모달 — 광고 시청 시뮬레이션 안내 + 확인 액션 */}
      <ConfirmModal
        open={showBonusModal}
        message={
          <span className="text-[17px] leading-snug">🎁 보너스 출석</span>
        }
        description={
          <>
            광고를 보고 <span className="font-semibold text-holo-purple-mid">{BONUS_POINTS}P</span>{" "}
            보너스를 받을 수 있어요.
            <br />
            보너스는 일주일에 한 번만 사용할 수 있어요.
          </>
        }
        confirmLabel="광고 보고 받기"
        cancelLabel="다음에"
        onConfirm={handleClaimBonus}
        onCancel={() => setShowBonusModal(false)}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * 보너스 출석 슬롯 — 그리드 8번째 자리에 들어가는 광고 보상 카드.
 *  - 미사용: 보라→핑크 그라데이션 카드 + 🎁 + "광고 보기" 텍스트로 시선 끌기
 *  - 사용 완료: 라일락 라이트 톤 + 체크 아이콘 + "사용완료" 표시
 */
function BonusSlot({
  used,
  onClick,
}: {
  used: boolean;
  onClick: () => void;
}) {
  if (used) {
    return (
      <div className="pt-3">
        <div className="relative flex h-[88px] flex-col items-center justify-center gap-1 rounded-[14px] border border-holo-lilac-soft bg-holo-lilac-card-2/60 px-1 py-2 text-center">
          <p className="text-[11px] font-medium text-holo-ink-3">보너스</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
            <CheckIcon />
          </span>
          <p className="text-[10px] font-semibold text-holo-purple-mid">
            사용 완료
          </p>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className="pt-3 text-left">
      <div className="relative flex h-[88px] flex-col items-center justify-center gap-0.5 rounded-[14px] bg-gradient-to-br from-holo-pink-soft to-holo-purple-mid px-1 py-2 text-center shadow-[0_4px_12px_rgba(255,108,184,0.3)] transition active:scale-[0.97]">
        <span className="text-[20px] leading-none">🎁</span>
        <p className="text-[11px] font-bold text-white">보너스</p>
        <p className="text-[9px] font-medium text-white/90">광고 보기</p>
      </div>
    </button>
  );
}

/**
 * 일별 카드 — 상태에 따라 3가지 모양.
 *   - 오늘(아직 미체크): 보라 테두리 + "오늘" 뱃지 + 큼직한 P 표시
 *   - 완료: 라일락 배경 + 체크 아이콘 (어느 일차였는지 표시)
 *   - 미완료(미래/지난날): 흰 배경 + 점선 테두리 + 회색 P 표시
 *   - 보너스 일차(label 있음)는 우측 상단에 작은 골드 별표.
 */
function DayCardSlot({ day }: { day: Day }) {
  const isBonus = !!day.label;

  if (day.isToday && !day.checked) {
    return (
      <div className="relative pt-3">
        <span className="absolute left-1/2 top-[4px] z-10 -translate-x-1/2 rounded-full bg-holo-purple-mid px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(116,72,221,0.35)]">
          오늘
        </span>
        <div className="relative flex h-[88px] flex-col items-center justify-center rounded-[14px] border-2 border-holo-purple-mid bg-white px-1 py-3 text-center shadow-[0_4px_10px_rgba(116,72,221,0.12)]">
          {isBonus && <BonusStar />}
          <p className="text-[11px] font-medium text-holo-ink-3">
            {day.day}일차
          </p>
          <p className="mt-0.5 text-[18px] font-extrabold text-holo-purple-mid">
            {day.points}P
          </p>
          {/* 라벨은 absolute 로 빼서 1일차/5P 가 사각형 정중앙에 고정되도록 함 */}
          {day.label && <DayLabelChip text={day.label} variant="active" />}
        </div>
      </div>
    );
  }

  if (day.checked) {
    return (
      <div className="pt-3">
        <div className="relative flex h-[88px] flex-col items-center justify-center gap-1 rounded-[14px] bg-holo-lilac-card-2 px-1 py-2 text-center">
          {isBonus && <BonusStar />}
          <p className="text-[11px] font-medium text-holo-ink-3">
            {day.day}일차
          </p>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
            <CheckIcon />
          </span>
          <p className="text-[10px] font-semibold text-holo-purple-mid">
            +{day.points}P
          </p>
        </div>
      </div>
    );
  }

  // 미완료 — 미래 일차 또는 지난 날인데 출석 못 한 경우.
  // 페이지 배경이 흰색이므로 흰 카드 + 점선만 두면 거의 안 보임 → 연한 라일락 배경으로 분리감 확보.
  return (
    <div className="pt-3">
      <div className="relative flex h-[88px] flex-col items-center justify-center rounded-[14px] border border-holo-lilac-soft bg-holo-lilac-card-2/50 px-1 py-3 text-center">
        {isBonus && <BonusStar muted />}
        <p className="text-[11px] font-medium text-holo-ink-4">
          {day.day}일차
        </p>
        <p className="mt-0.5 text-[18px] font-extrabold text-holo-ink-4">
          {day.points}P
        </p>
        {day.label && <DayLabelChip text={day.label} variant="muted" />}
      </div>
    </div>
  );
}

/**
 * 일별 카드 하단에 absolute 로 고정되는 보조 라벨 칩 (예: "연속보너스", "스페셜").
 * flex flow 에서 빼서 1일차/5P 같은 메인 텍스트가 카드 정중앙에 위치하도록 한다.
 */
function DayLabelChip({ text, variant = "active" }: { text: string; variant?: "active" | "muted" }) {
  // muted = 미완료 일차의 라벨 — 완료/오늘 일차와 시각적으로 구분되도록 흐리게.
  return (
    <span
      className={`absolute bottom-[-6px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-holo-gradient-soft px-2 py-1 text-[9px] font-bold leading-tight text-white shadow-[0_2px_6px_rgba(255,108,184,0.35)] ${
        variant === "muted" ? "opacity-50 saturate-50" : ""
      }`}
    >
      {text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 아이콘 / 일러스트
// ─────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7C3AED"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** 보너스 일차 카드 우측 상단의 작은 별 — 가독성을 위해 별도 그림자 X. */
function BonusStar({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={muted ? "#D9D9D9" : "#F4A100"}
      aria-hidden
      className="absolute right-1.5 top-1.5"
    >
      <path d="M12 2l2.39 6.95H22l-6.13 4.45L18.18 22 12 17.77 5.82 22l2.31-8.6L2 8.95h7.61z" />
    </svg>
  );
}

function CalendarIllustration() {
  // 진한 보라 그라데이션 배경 위 — 흰 노트가 또렷이 떠 있게,
  // 노트 안 디테일은 진한 보라로, 노트 바깥 요소(고리·반짝이)는 흰색으로 처리.
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 60 60"
      fill="none"
      aria-hidden
      className="shrink-0 drop-shadow-[0_3px_8px_rgba(0,0,0,0.22)]"
    >
      {/* 노트 시트 — 흰색 베이스 (진한 보라 위에서 확실히 대비) */}
      <rect x="9" y="11" width="38" height="40" rx="6" fill="#FFFFFF" />
      {/* 상단 바 — 라이트 보라로 대비. 노트 안쪽이라 너무 어둡지 않아야 함. */}
      <rect x="9" y="11" width="38" height="10" rx="6" fill="#B77CFF" />
      {/* 노트 외곽 라인 — 살짝 진한 보라로 윤곽 강조 */}
      <rect
        x="9"
        y="11"
        width="38"
        height="40"
        rx="6"
        stroke="#542BB4"
        strokeWidth="2"
      />
      {/* 위쪽 고리 — 진한 배경 위라 흰색으로 또렷하게 */}
      <rect x="14" y="6" width="3.5" height="9" rx="1.75" fill="#FFFFFF" />
      <rect x="38.5" y="6" width="3.5" height="9" rx="1.75" fill="#FFFFFF" />
      {/* 큰 체크 — 노트 흰 베이스 위라 진한 보라 */}
      <path
        d="M19 35 L26 42 L38 28"
        stroke="#542BB4"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 반짝이 — 진한 배경 위 흰색 */}
      <path
        d="M50 18 L50 24 M47 21 L53 21"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M53 36 L53 40 M51 38 L55 38"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoBadge() {
  return (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-holo-lilac-card-2">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7448DD"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8h.01" />
        <path d="M11 12h1v5h1" />
      </svg>
    </span>
  );
}
