import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";

type Phase = "permission" | "detecting" | "confirm" | "success";

const NEARBY_AREAS = [
  { id: "bundang-jeongja", label: "성남시 분당구 정자동", primary: true },
  { id: "bundang-sunae", label: "성남시 분당구 수내동" },
  { id: "bundang-seohyeon", label: "성남시 분당구 서현동" },
];

export function VerifyRegionScreen() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("permission");
  const [picked, setPicked] = useState<string>("bundang-jeongja");

  // detecting → confirm 자동 전환
  useEffect(() => {
    if (phase === "detecting") {
      const t = setTimeout(() => setPhase("confirm"), 1600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const grant = () => setPhase("detecting");
  const confirm = () => setPhase("success");
  const finish = () => navigate(-1);

  const pickedLabel =
    NEARBY_AREAS.find((a) => a.id === picked)?.label ?? NEARBY_AREAS[0].label;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          동네 인증
        </span>
      </header>

      {phase === "permission" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-6 text-center">
          <div className="mt-2 flex h-32 w-32 items-center justify-center rounded-full bg-holo-lilac-card-2">
            <PinIcon size={56} />
          </div>
          <h1 className="mt-6 text-[18px] font-bold leading-snug text-holo-ink">
            위치 권한이 필요해요
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-holo-ink-3">
            홀로는 위치 정보를 사용해
            <br />
            현재 머무는 동네를 확인해요.
            <br />
            이 정보는 동네 인증과 주변 모임 추천에만 사용돼요.
          </p>

          <ul className="mt-6 flex w-full flex-col gap-2 text-left text-[12px] text-holo-ink-2">
            <Bullet>대략적인 행정동까지만 사용해요 (정확한 좌표 X)</Bullet>
            <Bullet>인증은 3개월에 한 번 갱신해주시면 돼요</Bullet>
            <Bullet>인증 완료 시 +10P가 지급돼요</Bullet>
          </ul>

          <div className="mt-auto w-full pb-4 pt-6">
            <button
              type="button"
              onClick={grant}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99]"
            >
              위치 권한 허용
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-2 h-10 w-full text-[13px] text-holo-ink-3"
            >
              나중에 할게요
            </button>
          </div>
        </section>
      )}

      {phase === "detecting" && (
        <section className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute h-40 w-40 animate-ping rounded-full bg-holo-purple-mid/20" />
            <span className="absolute h-28 w-28 animate-pulse rounded-full bg-holo-purple-mid/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-holo-purple-mid">
              <PinIcon size={36} fill="white" stroke="white" />
            </div>
          </div>
          <h1 className="mt-8 text-[18px] font-bold text-holo-ink">
            동네를 확인하고 있어요...
          </h1>
          <p className="mt-2 text-[13px] text-holo-ink-3">
            잠시만 기다려주세요.
          </p>
        </section>
      )}

      {phase === "confirm" && (
        <section className="flex flex-1 flex-col px-4 pt-2">
          <div className="mt-2 rounded-holo-card bg-holo-hero p-6 text-center">
            <p className="text-[12px] text-holo-purple-mid">감지된 위치</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-[20px] font-bold text-holo-ink">
              <PinIcon size={20} /> {pickedLabel}
            </p>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              GPS · 오차범위 약 30m
            </p>
          </div>

          <p className="mt-5 text-[13px] font-semibold text-holo-ink">
            여기가 내 동네가 맞나요?
          </p>
          <p className="mt-1 text-[12px] text-holo-ink-3">
            정확하지 않다면 아래에서 다시 선택할 수 있어요.
          </p>

          <ul className="mt-3 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
            {NEARBY_AREAS.map((a) => {
              const active = picked === a.id;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(a.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] text-holo-ink">{a.label}</span>
                      {a.primary && (
                        <span className="rounded-full bg-holo-lilac-card px-2 py-0.5 text-[11px] font-semibold text-holo-purple-mid">
                          가장 가까움
                        </span>
                      )}
                    </div>
                    <Radio selected={active} />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setPhase("detecting")}
            className="mt-3 self-end text-[12px] text-holo-purple-mid underline"
          >
            다시 감지하기
          </button>

          <p className="mt-4 text-[11px] leading-5 text-holo-ink-3">
            · 거짓으로 인증하면 서비스 이용이 제한될 수 있어요.
            <br />· 등록한 동네는 3개월 뒤 다시 인증해주세요.
          </p>

          <div className="mt-auto pb-4 pt-6">
            <button
              type="button"
              onClick={confirm}
              className="h-[60px] w-full rounded-holo-pill bg-holo-ink text-[16px] font-semibold text-white active:scale-[0.99]"
            >
              이 동네로 인증하기
            </button>
          </div>
        </section>
      )}

      {phase === "success" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[300px] rounded-[14px] bg-white p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-holo-lilac-card-2 text-[28px]">
              ✅
            </div>
            <p className="mt-3 text-[16px] font-bold text-holo-ink">
              동네 인증 완료!
            </p>
            <p className="mt-1 text-[14px] text-holo-purple-mid">
              {pickedLabel}
            </p>
            <p className="mt-3 text-[20px] font-bold text-holo-purple-mid">
              +10P
            </p>
            <p className="mt-1 text-[12px] text-holo-ink-3">
              인증은 {nextRenewDate()} 에 다시 해주세요.
            </p>
            <button
              type="button"
              onClick={finish}
              className="mt-4 h-10 w-full rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 미사용 변수 워닝 방지 */}
      <span className="hidden">{ME.region}</span>
    </main>
  );
}

function nextRenewDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-holo-purple-mid" />
      <span>{children}</span>
    </li>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
        selected ? "border-holo-purple-mid" : "border-holo-line"
      }`}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-holo-purple-mid" />}
    </span>
  );
}

function PinIcon({
  size = 16,
  fill = "#7448DD",
  stroke = "#7448DD",
}: {
  size?: number;
  fill?: string;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth="1"
      aria-hidden
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" fill="white" />
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
