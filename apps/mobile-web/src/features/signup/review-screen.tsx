import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";
import { ConfirmModal } from "@/shared/components/confirm-modal";

/**
 * 가입 직전 요약 화면.
 * 모든 입력값을 한 번에 보여주고 항목별로 수정 링크를 제공.
 * "가입 완료"를 누르면 환영 모달이 떠서 마지막 인사 후 룸 튜토리얼로 이동.
 *
 * 백엔드 연결 시 handleComplete에서 회원가입 API 호출 → 토큰 저장 →
 * 환영 모달 → 룸 튜토리얼 흐름으로 교체하면 됩니다.
 */
export function ReviewScreen() {
  const navigate = useNavigate();
  const { data } = useSignup();
  const [showWelcome, setShowWelcome] = useState(false);

  const allInterests = [...data.interests];
  if (data.customInterest.trim()) {
    allInterests.push(data.customInterest.trim());
  }

  const handleComplete = () => {
    // TODO: POST /auth/signup with `data`
    // 실제 가입 확정과 보상 발급(뱃지/칭호/포인트)은 마지막 단계인 room-screen 에서 처리한다.
    // (이전 테스트 계정 데이터를 일괄 리셋한 직후에 발급해야 안전함)
    setShowWelcome(true);
  };

  const handleStart = () => navigate("/signup/room");

  return (
    <SignupLayout step={6}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        이렇게 가입할게요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        내용을 확인하고 가입을 완료해 주세요.
      </p>

      <div className="mt-7 flex flex-col divide-y divide-holo-line rounded-holo-input border border-holo-line">
        <ReviewItem label="닉네임" value={data.nickname || "-"} />
        <ReviewItem label="이름" value={data.name || "-"} />
        <ReviewItem
          label="휴대폰"
          value={data.phone ? formatPhone(data.phone) : "-"}
        />
        <ReviewItem
          label="비밀번호"
          value={data.password ? "•".repeat(Math.min(data.password.length, 12)) : "-"}
        />
        <ReviewItem
          label="관심사"
          value={allInterests.length > 0 ? allInterests.join(", ") : "-"}
          multiline
        />
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleComplete}
          className="h-[60px] w-full rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99]"
        >
          가입 완료
        </button>
      </div>

      {showWelcome && (
        <WelcomeModal nickname={data.nickname || "회원"} onStart={handleStart} />
      )}
    </SignupLayout>
  );
}

function ReviewItem({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="text-[12px] text-holo-ink-3">{label}</span>
        <span
          className={`text-[14px] text-holo-ink ${multiline ? "break-words" : "truncate"}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * 가입 완료 직후 띄우는 환영 모달.
 * 가입 절차의 끝을 명확하게 인지시키고, 다음 단계(룸 튜토리얼)로 자연스럽게 연결.
 */
function WelcomeModal({
  nickname,
  onStart,
}: {
  nickname: string;
  onStart: () => void;
}) {
  return (
    <ConfirmModal
      open
      message={
        <>
          <span className="text-holo-purple-mid">{nickname}</span>님,
          <br />
          가입을 환영해요!
        </>
      }
      description={
        <>
          이제 마지막으로 마이룸을 꾸며볼게요.
          <br />
          취향에 맞는 가구를 골라보세요.
        </>
      }
      singleAction
      confirmLabel="시작하기"
      onConfirm={onStart}
    />
  );
}

function formatPhone(v: string) {
  if (!v) return "";
  if (v.length < 4) return v;
  if (v.length < 8) return `${v.slice(0, 3)}-${v.slice(3)}`;
  return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
}
