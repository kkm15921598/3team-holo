import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { supabase } from "@/shared/lib/supabaseClient";

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

  const handleComplete = async () => {
    // 항상 존재하는 핵심 컬럼.
    const coreRow = {
      phone: data.phone,
      password: data.password,
      nickname: data.nickname,
      gender: data.gender,
    };
    // 본인인증 상태를 가입 insert 시점에 함께 저장.
    // (이전엔 room-screen 도달 시에만 phone_verified 를 기록해, 가입 직후 새로고침/이탈로
    //  room-screen 에 못 가면 DB 가 phone_verified=false 로 영구히 남아 미인증이 됐다.)
    const verifiedRow = { ...coreRow, phone_verified: data.phoneVerified };
    // 선택 컬럼:
    //  - name: 아이디/비밀번호 찾기(name+phone 본인확인)에 필요 → 가능하면 꼭 저장.
    //  - interests: 이웃찾기 매칭용(jsonb).
    // 환경에 따라 컬럼이 아직 없을 수 있어(예: "could not find the 'name' column ..."),
    // 컬럼 미존재(42703 / PGRST204) 에러면 선택 컬럼을 단계적으로 빼며 재시도해
    // 가입 자체가 막히지 않게 한다. (컬럼을 추가하면 첫 시도에서 전부 저장됨.)
    // 맨 마지막 coreRow 는 phone_verified 컬럼조차 없는 환경의 최후 폴백.
    const attempts = [
      { ...verifiedRow, name: data.name, interests: allInterests },
      { ...verifiedRow, name: data.name },
      { ...verifiedRow, interests: allInterests },
      verifiedRow,
      coreRow,
    ];
    let error: { code?: string; message: string } | null = null;
    for (const row of attempts) {
      const res = await supabase.from("users").insert(row);
      error = res.error;
      if (!error) break;
      // 중복가입은 폴백해도 의미 없음 / 컬럼 미존재가 아닌 다른 에러도 중단.
      if (error.code === "23505") break;
      if (error.code !== "42703" && error.code !== "PGRST204") break;
    }

    if (error) {
      // PostgreSQL unique 제약조건 위반 (중복 가입 시도)
      if (error.code === "23505") {
        alert("이미 가입된 번호예요. 다른 번호로 시도해주세요.");
      } else {
        alert("회원가입 중 오류가 발생했어요: " + error.message);
      }
      return;
    }

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
        <span className="text-[18px] leading-snug">
          <span className="text-holo-purple-mid">{nickname}</span>님,
          <br />
          가입을 환영해요!
        </span>
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
