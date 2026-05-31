import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePoints, usePointHistory } from "@/features/myroom/myroom-store";

/** 한 번에 보여줄 내역 수 — '더보기' 누를 때마다 이만큼씩 추가. */
const PAGE_SIZE = 10;

export function PointsScreen() {
  const navigate = useNavigate();
  const points = usePoints();
  const history = usePointHistory();

  // 필터 — 년도/월. ""(빈 값)은 '전체' 의미.
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  // 더보기로 펼친 개수 — 필터 바뀌면 다시 10개로 접힘.
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  // 내역 날짜는 "YY.MM.DD" 형식 → [yy, mm, dd] 로 분해해 필터/옵션 생성.
  const parse = (date: string): { yy: string; mm: string } => {
    const [yy = "", mm = ""] = date.split(".");
    return { yy, mm };
  };

  // 내역에 실제로 존재하는 연도 목록(내림차순) — 셀렉트 옵션.
  const years = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => set.add(parse(h.date).yy));
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      const { yy, mm } = parse(h.date);
      if (year && yy !== year) return false;
      if (month && mm !== month) return false;
      return true;
    });
  }, [history, year, month]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  // 필터를 바꾸면 펼친 개수를 초기화해 항상 최근 10개부터 보이게.
  const resetVisible = () => setVisible(PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center px-0">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">포인트</span>
      </header>

      {/* Balance */}
      <section className="flex items-center justify-between rounded-holo-input bg-holo-purple-mid px-5 py-4 text-white">
        <span className="text-[14px] font-semibold">보유포인트</span>
        <span className="text-[20px] font-bold">{points} P</span>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-3 gap-2">
        <Quick label="출석체크" icon={<CalIcon />} onClick={() => navigate("/event/attendance")} />
        <Quick label="무료포인트" icon={<PCircleIcon />} onClick={() => navigate("/mypage/points/free")} />
        <Quick label="상점" icon={<ShopIcon />} onClick={() => navigate("/myroom")} />
      </section>

      {/* History */}
      <section className="mt-[10px]">
        <div className="flex items-center justify-between border-b border-holo-surface-2 pb-2">
          <p className="text-[16px] font-semibold text-holo-ink">포인트 이용 내역</p>
          {/* 년도/월 셀렉트 — 내역을 기간별로 추려서 본다. */}
          <div className="flex items-center gap-1.5">
            <FilterSelect
              value={year}
              onChange={(v) => {
                setYear(v);
                resetVisible();
              }}
              ariaLabel="년도 선택"
            >
              <option value="">전체 년도</option>
              {years.map((y) => (
                <option key={y} value={y}>{`20${y}년`}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={month}
              onChange={(v) => {
                setMonth(v);
                resetVisible();
              }}
              ariaLabel="월 선택"
            >
              <option value="">전체 월</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <option key={m} value={m}>{`${Number(m)}월`}</option>
              ))}
            </FilterSelect>
          </div>
        </div>

        <ul className="flex flex-col">
          {filtered.length === 0 && (
            <li className="py-6 text-center text-[13px] text-holo-ink-3">
              {history.length === 0
                ? "아직 포인트 이용 내역이 없어요."
                : "해당 기간의 이용 내역이 없어요."}
            </li>
          )}
          {shown.map((h) => (
            <li key={h.id} className="flex items-start gap-3 border-b border-holo-line-3 py-3">
              {/* 날짜는 위 줄, 그 아래에 작은 시간 라벨 — 시각이 없는 옛 항목은 날짜만 노출. */}
              <div className="flex shrink-0 flex-col">
                <span className="text-[13px] text-holo-ink-2">{h.date}</span>
                {h.time && (
                  <span className="mt-0.5 text-[11px] text-holo-ink-3">
                    {h.time}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-[14px] text-holo-ink">{h.title}</span>
                {h.note && <span className="text-[12px] text-holo-ink-3">{h.note}</span>}
              </div>
              <span
                className={`text-[14px] font-bold ${
                  h.amount >= 0 ? "text-holo-purple-mid" : "text-holo-error-2"
                }`}
              >
                {h.amount >= 0 ? "+" : ""}
                {h.amount}P
              </span>
            </li>
          ))}
        </ul>

        {/* 더보기 — 펼친 개수보다 내역이 더 있을 때만 노출. */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="mt-3 h-[44px] w-full rounded-holo-input border border-holo-line-3 text-[14px] font-semibold text-holo-ink-2 active:bg-holo-surface-2"
          >
            더보기
          </button>
        )}
      </section>

    </main>
  );
}

/** 내역 필터용 셀렉트 — 우측 작은 화살표가 달린 알약형 드롭다운. */
function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-holo-line-3 bg-white py-1 pl-3 pr-7 text-[12px] font-medium text-holo-ink-2 focus:outline-none"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-holo-ink-3">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}

function Quick({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-holo-card bg-white shadow-holo-card"
    >
      <span className="text-holo-purple-mid">{icon}</span>
      <span className="text-[13px] font-semibold text-holo-ink">{label}</span>
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 14h.01M13 14h.01M17 14h.01M9 18h.01" />
    </svg>
  );
}

function PCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 16V8h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}
