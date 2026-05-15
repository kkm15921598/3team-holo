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

const DETAIL_BY_ID: Record<string, string> = {
  personal:
    "HOLO 는 회원 가입과 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.\n" +
    "• 수집 항목: 이름, 생년월일, 성별, 휴대폰 번호, 닉네임, 프로필 이미지, 관심사\n" +
    "• 수집 목적: 회원 식별, 본인 확인, 동네 모임 추천, 부정 이용 방지\n" +
    "• 보유 및 이용 기간: 회원 탈퇴 시까지 (관계 법령에 따른 의무 보관 항목은 해당 기간까지)\n" +
    "동의를 거부할 권리가 있으며, 거부 시 회원 가입이 제한될 수 있습니다.",
  location:
    "HOLO 는 위치 기반 모임·이웃 추천을 위해 위치 정보를 수집·이용합니다.\n" +
    "• 수집 항목: 단말의 GPS 좌표, 행정동(구·동) 단위 위치\n" +
    "• 수집 목적: 동네 인증, 거리 기반 모임 추천, 주변 게시글 노출\n" +
    "• 정밀도: 정확한 좌표는 인증 절차에만 일시 사용되고 저장되지 않으며, 행정동 단위로만 보관됩니다.\n" +
    "• 보유 기간: 동네 인증 갱신(3개월) 시까지 또는 회원 탈퇴 시까지\n" +
    "기기 설정에서 언제든 위치 권한을 해제할 수 있으며, 미동의 시 일부 위치 기반 기능이 제한됩니다.",
  reward:
    "HOLO 리워드 프로그램은 꾸준히 활동하는 회원에게 다양한 혜택을 제공합니다.\n" +
    "• 적립 활동: 출석 체크, 게시글·댓글 작성, 동네 인증, 모임 참여, 친구 초대 등\n" +
    "• 지급 혜택: 포인트, 레벨업, 뱃지, 칭호, 마이룸 한정 가구 잠금 해제\n" +
    "• 사용처: 마이룸 가구 구매, 이벤트 응모, 한정 콘텐츠 이용\n" +
    "미동의 시 활동에 따른 포인트·뱃지가 적립되지 않으며, 마이룸 일부 콘텐츠 이용이 제한될 수 있습니다.",
  marketing:
    "HOLO 는 새로운 소식과 혜택을 안내해 드리기 위해 마케팅 정보를 발송합니다.\n" +
    "• 수신 채널: 앱 푸시 알림, 이메일, SMS\n" +
    "• 발송 내용: 신규 기능 안내, 이벤트·쿠폰, 동네 인기 소식, 광고성 정보\n" +
    "• 발송 주기: 사안에 따라 비정기적으로 발송됩니다.\n" +
    "• 수신 거부: 마이페이지 > 알림 설정에서 언제든 변경할 수 있습니다.\n" +
    "미동의 시에도 회원 가입·결제·보안 등 서비스 필수 알림은 정상 발송됩니다.",
};

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

      <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <span className={`text-[15px] ${isRequiredFail ? "text-holo-error" : "text-holo-ink"}`}>
                    {it.label}{" "}
                    <span className={isRequiredFail ? "text-holo-error" : "text-holo-ink-3"}>
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
                <div className="whitespace-pre-line break-keep rounded-[12px] border border-holo-ink-4 px-3.5 py-3 text-[12px] leading-[1.65] text-holo-ink-2">
                  {DETAIL_BY_ID[it.id] ?? ""}
                </div>
              )}
            </li>
          );
        })}
      </ul>

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4 12 6 6 10-14" />
        </svg>
      )}
    </span>
  );
}
