import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

type TermItem = {
  id: string;
  label: string;
  required: boolean;
  hasDetail: boolean;
};

const ITEMS: TermItem[] = [
  { id: "age", label: "만 14세 이상입니다.", required: true, hasDetail: false },
  { id: "service", label: "서비스 이용약관에 동의", required: true, hasDetail: false },
  { id: "personal", label: "개인정보 수집 및 이용에 동의", required: true, hasDetail: true },
  { id: "location", label: "위치 정보 수집 및 이용에 동의", required: true, hasDetail: true },
  { id: "reward", label: "리워드 프로그램 참여에 동의", required: false, hasDetail: true },
  { id: "marketing", label: "광고 및 마케팅 수신에 동의", required: false, hasDetail: true },
];

const DETAIL_TEXT =
  "본 약관은 HOLO 서비스 이용과 관련하여 사용자와 서비스 제공자 간의 권리, 의무 및 책임 사항을 안내하기 위한 내용입니다. 사용자는 서비스 이용 전 약관 내용을 확인하고 동의해야 하며, 개인정보 수집 및 위치 정보 활용 등 필요한 항목에 대해 선택적으로 동의할 수 있습니다.";

export function TermsScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();
  const checked = data.agreedTerms;
  const setChecked = (next: Record<string, boolean>) => update("agreedTerms", next);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showError, setShowError] = useState(false);

  const allChecked = useMemo(() => ITEMS.every((it) => checked[it.id]), [checked]);
  const requiredOk = useMemo(
    () => ITEMS.filter((it) => it.required).every((it) => checked[it.id]),
    [checked],
  );

  const toggleAll = () => {
    const next = !allChecked;
    setChecked(Object.fromEntries(ITEMS.map((it) => [it.id, next])));
    setShowError(false);
  };
  const toggleOne = (id: string) => {
    setChecked({ ...checked, [id]: !checked[id] });
    setShowError(false);
  };
  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleNext = () => {
    if (!requiredOk) {
      setShowError(true);
      return;
    }
    navigate("/signup/verify");
  };

  return (
    <SignupLayout step={1}>
      {/*
        레이아웃 메모:
        - 제목 + "모두 동의" + 구분선 + 약관 리스트 + 하단 버튼이 한 화면에 함께 들어갑니다.
        - 약관 리스트(ul)만 flex-1 + overflow-y-auto + min-h-0 으로 자체 스크롤 영역으로
          만들면, 항목을 펼쳐도 헤더와 "다음" 버튼 위치가 흔들리지 않습니다.
        - SignupLayout이 children 영역을 flex flex-col flex-1 로 깔아주기 때문에 가능.
      */}
      <h1 className="shrink-0 text-[20px] font-bold leading-snug text-holo-ink">
        HOLO 서비스 사용에 필요한
        <br />
        이용 약관에 동의해 주세요!
      </h1>

      <button
        type="button"
        onClick={toggleAll}
        className="mt-7 flex shrink-0 items-center gap-3 text-left"
      >
        <Checkmark active={allChecked} />
        <span className="text-[16px] font-semibold text-holo-ink">
          모두 동의 <span className="text-holo-ink-3 font-normal">(선택 정보 포함)</span>
        </span>
      </button>

      <div className="my-5 h-px w-full shrink-0 bg-holo-line" />

      {/* 스크롤 영역 — 펼침/접힘으로 늘어나도 헤더/버튼 위치는 고정됨 */}
      <ul
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ITEMS.map((it) => {
          const isRequiredFail = showError && it.required && !checked[it.id];
          return (
            <li key={it.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleOne(it.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <Checkmark active={!!checked[it.id]} />
                  <span
                    className={`text-[15px] ${
                      isRequiredFail ? "text-holo-error" : "text-holo-ink"
                    }`}
                  >
                    {it.label}{" "}
                    <span
                      className={isRequiredFail ? "text-holo-error" : "text-holo-ink-3"}
                    >
                      ({it.required ? "필수" : "선택"})
                    </span>
                  </span>
                </button>
                {it.hasDetail && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(it.id)}
                    className="text-[13px] text-holo-ink-3 underline-offset-2 hover:underline"
                  >
                    {expanded[it.id] ? "접기" : "보기"}
                  </button>
                )}
              </div>
              {it.hasDetail && expanded[it.id] && (
                <div className="rounded-[12px] border border-holo-ink-4 p-3 text-[12px] leading-relaxed text-holo-ink-2">
                  {DETAIL_TEXT}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 하단 영역 — 항상 화면 하단에 고정. mt-auto가 아닌 shrink-0 + pt-6 로 스크롤 영역과 시각적 분리 */}
      <div className="flex shrink-0 flex-col gap-3 pt-6">
        {showError && (
          <p className="text-center text-[13px] text-holo-error">이용 약관에 동의해 주세요.</p>
        )}
        <button
          type="button"
          onClick={handleNext}
          className={`h-[60px] rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            requiredOk ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>
    </SignupLayout>
  );
}

function Checkmark({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
        active ? "border-holo-ink bg-holo-ink" : "border-holo-ink-4 bg-white"
      }`}
    >
      {active && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m4 12 6 6 10-14" />
        </svg>
      )}
    </span>
  );
}
