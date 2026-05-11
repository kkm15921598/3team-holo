import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const DAYS = [
  { id: "mon", label: "월" },
  { id: "tue", label: "화" },
  { id: "wed", label: "수" },
  { id: "thu", label: "목" },
  { id: "fri", label: "금" },
  { id: "sat", label: "토" },
  { id: "sun", label: "일" },
];

export function QuietHoursScreen() {
  const navigate = useNavigate();
  const [startH, setStartH] = useState(22);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(8);
  const [endM, setEndM] = useState(0);
  const [days, setDays] = useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  });

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const isOvernight = startH * 60 + startM > endH * 60 + endM;

  const toggleDay = (id: string) =>
    setDays((d) => ({ ...d, [id]: !d[id] }));
  const setAll = (v: boolean) =>
    setDays(Object.fromEntries(DAYS.map((d) => [d.id, v])));

  const dayCount = Object.values(days).filter(Boolean).length;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <div className="flex items-center">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
          <span className="ml-2 text-[16px] font-semibold text-holo-ink">
            방해 금지 시간
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[14px] font-semibold text-holo-purple-mid"
        >
          저장
        </button>
      </header>

      {/* 미리보기 */}
      <section className="px-4 pt-2">
        <div className="rounded-holo-input bg-holo-lilac-card-2 px-4 py-4 text-center">
          <p className="text-[12px] text-holo-ink-3">선택한 시간 동안 알림이 오지 않아요</p>
          <p className="mt-1 text-[22px] font-bold text-holo-ink">
            {formatTime(startH, startM)}
            <span className="mx-2 text-holo-ink-3">~</span>
            {formatTime(endH, endM)}
          </p>
          {isOvernight && (
            <p className="mt-1 text-[11px] text-holo-purple-mid">
              다음 날 {formatTime(endH, endM)} 까지 적용
            </p>
          )}
        </div>
      </section>

      {/* 시작 시간 */}
      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">시작 시간</p>
        <div className="mt-2 flex gap-2">
          <TimeWheel value={startH} options={HOURS} unit="시" onChange={setStartH} />
          <TimeWheel value={startM} options={MINUTES} unit="분" onChange={setStartM} />
        </div>
      </section>

      {/* 종료 시간 */}
      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">종료 시간</p>
        <div className="mt-2 flex gap-2">
          <TimeWheel value={endH} options={HOURS} unit="시" onChange={setEndH} />
          <TimeWheel value={endM} options={MINUTES} unit="분" onChange={setEndM} />
        </div>
      </section>

      {/* 요일 */}
      <section className="mt-4 px-4 pb-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] text-holo-ink-3">반복 요일 ({dayCount}일)</p>
          <div className="flex gap-3 text-[12px]">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="text-holo-purple-mid"
            >
              매일
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="text-holo-ink-3"
            >
              해제
            </button>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          {DAYS.map((d) => {
            const on = days[d.id];
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`flex h-10 flex-1 items-center justify-center rounded-full text-[14px] transition ${
                  on
                    ? "bg-holo-purple-mid text-white"
                    : "border border-holo-line text-holo-ink-2"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function TimeWheel({
  value,
  options,
  unit,
  onChange,
}: {
  value: number;
  options: number[];
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-holo-input border border-holo-line-3 bg-white">
      <div className="flex items-center justify-center border-b border-holo-line-3 py-2 text-[12px] text-holo-ink-3">
        {unit}
      </div>
      <div className="max-h-[160px] flex-1 overflow-y-auto py-1">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex h-9 w-full items-center justify-center text-[15px] transition ${
                active
                  ? "bg-holo-lilac-card-2 font-semibold text-holo-purple-mid"
                  : "text-holo-ink-2"
              }`}
            >
              {String(opt).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
