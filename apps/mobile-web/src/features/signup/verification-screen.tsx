import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "@/shared/hooks/use-countdown";
import { useSignup, genderFromIdNum } from "@/shared/contexts/signup-context";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { SignupLayout } from "./signup-layout";

const CARRIER_GROUPS: { label: string; items: string[] }[] = [
  { label: "통신사", items: ["SKT", "KT", "LG U+"] },
  { label: "알뜰폰", items: ["SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"] },
];

const MOCK_VERIFY_CODE = "123456";
const MOCK_REGISTERED_PHONES = ["01012345678"];

export function VerificationScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();

  const { name, idNum, carrier, phone } = data;

  const [showSheet, setShowSheet] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [showAlreadyJoined, setShowAlreadyJoined] = useState(false);
  const [showIdNum, setShowIdNum] = useState(false);

  const { formatted: codeTimer, expired: codeExpired, restart: restartTimer } =
    useCountdown(180, codeSent);

  const isNameValid = name.trim().length > 0;
  const isIdValid = idNum.length === 13;
  const isPhoneValid = phone.length >= 10;
  
  const baseFilled = isNameValid && isIdValid && carrier && isPhoneValid;
  const canSubmit = codeSent ? code.length === 6 : baseFilled;

  const handleMain = () => {
    setVerifyError("");

    if (!codeSent) {
      if (!baseFilled) return;
      setCodeSent(true);
      return;
    }

    if (code.length < 6) return;
    if (codeExpired) {
      setVerifyError("인증 시간이 만료되었습니다. 재전송해주세요.");
      return;
    }
    if (code !== MOCK_VERIFY_CODE) {
      setVerifyError("인증번호가 일치하지 않습니다.");
      return;
    }

    if (MOCK_REGISTERED_PHONES.includes(phone)) {
      setShowAlreadyJoined(true);
      return;
    }

    update("phoneVerified", true);
    navigate("/signup/account");
  };

  const handleResendCode = () => {
    setCode("");
    setVerifyError("");
    restartTimer();
  };

  return (
    <SignupLayout step={2}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        안전한 서비스 이용을 위해
        <br />
        본인인증을 진행해 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">회원여부 확인 및 가입을 진행합니다.</p>
      <p className="mt-1 text-[12px] text-holo-purple-mid">
        ※ 휴대폰 번호 1개당 아이디 1개만 만들 수 있어요. (테스트 인증번호: {MOCK_VERIFY_CODE})
      </p>

      <div className="mt-7 flex flex-col gap-3">
        <Input
          placeholder="이름 입력"
          value={name}
          onChange={(v) => update("name", v.slice(0, 20))}
          valid={isNameValid}
          maxLength={20}
        />

        <div className="relative">
          <Input
            placeholder="주민번호 입력"
            value={showIdNum ? formatIdRaw(idNum) : formatId(idNum)}
            onChange={(v) => {
              const next = parseIdInput(v, idNum, !showIdNum);
              update("idNum", next);
              // 뒷자리 첫 숫자가 입력되면 성별 자동 인식
              update("gender", genderFromIdNum(next));
            }}
            inputMode="numeric"
            valid={isIdValid}
            paddingRight
          />
          <PasswordToggle
            visible={showIdNum}
            onClick={() => setShowIdNum((s) => !s)}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className={`flex h-[62px] items-center justify-between rounded-holo-input border px-5 text-left text-[15px] ${
            carrier ? "border-2 border-holo-purple-mid text-holo-purple-mid" : "border-holo-ink-4 text-holo-ink-4"
          }`}
        >
          <span>{carrier ?? "통신사 선택"}</span>
          <ChevronDownIcon />
        </button>

        <Input
          placeholder="휴대폰 번호 입력"
          value={formatPhone(phone)}
          onChange={(v) => update("phone", v.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
          autoComplete="tel"
          valid={isPhoneValid}
        />

        {codeSent && (
          <div className="flex flex-col gap-1">
            <div className="relative">
              <Input
                placeholder="인증번호 입력"
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, "").slice(0, 6));
                  setVerifyError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                valid={code.length === 6}
                error={!!verifyError}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] text-holo-error">
                {codeTimer}
              </span>
            </div>
            {verifyError && (
              <p className="pl-2 text-[13px] text-holo-error">{verifyError}</p>
            )}
            {!verifyError && codeExpired && (
              <p className="pl-2 text-[13px] text-holo-error">
                인증 시간이 만료되었습니다. 재전송해주세요.
              </p>
            )}
            <button
              type="button"
              onClick={handleResendCode}
              className="self-end pr-2 pt-1 text-[12px] text-holo-ink-3 underline"
            >
              문자가 오지 않는다면? 재전송
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleMain}
          disabled={!canSubmit}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canSubmit ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          {codeSent ? "인증 확인" : "인증하기"}
        </button>
      </div>

      {showSheet && (
        <CarrierSheet
          selected={carrier}
          onSelect={(v) => {
            update("carrier", v);
            setShowSheet(false);
          }}
          onClose={() => setShowSheet(false)}
        />
      )}

      {showAlreadyJoined && (
        <AlreadyJoinedModal
          onLogin={() => navigate("/login", { replace: true })}
          onFindPassword={() => navigate("/auth/find-password", { replace: true })}
          onClose={() => setShowAlreadyJoined(false)}
        />
      )}
    </SignupLayout>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  inputMode,
  onBlur,
  error,
  valid,
  maxLength,
  autoComplete,
  paddingRight,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "email";
  onBlur?: () => void;
  error?: boolean;
  valid?: boolean;
  maxLength?: number;
  autoComplete?: string;
  paddingRight?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const enforceMax = (target: HTMLInputElement) => {
    let v = target.value;
    if (maxLength != null && v.length > maxLength) {
      v = v.slice(0, maxLength);
      target.value = v;
    }
    return v;
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={inputMode ?? "text"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(enforceMax(e.target))}
      onCompositionEnd={(e) => {
        const v = enforceMax(e.currentTarget);
        if (v !== value) onChange(v);
      }}
      onBlur={onBlur}
      className={`h-[62px] w-full rounded-holo-input ${paddingRight ? "pr-12 pl-5" : "px-5"} text-[15px] outline-none ${
        error
          ? "border-2 border-holo-error"
          : valid
            ? "border-2 border-holo-purple-mid text-holo-purple-mid"
            : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
      }`}
    />
  );
}

function CarrierSheet({ selected, onSelect, onClose }: any) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose}>
      <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-[15px] bg-white px-5 pb-8 pt-3 md:max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-[6px] w-[70px] rounded-full bg-holo-line" />
        <p className="mb-4 text-center text-[16px] font-semibold text-holo-ink">통신사를 선택해 주세요.</p>
        <div className="flex flex-col gap-5">
          {CARRIER_GROUPS.map((group, i) => (
            <section key={group.label} className="flex flex-col gap-2">
              <header className="flex items-center gap-3 px-1">
                <span className="text-[12px] font-semibold tracking-wide text-holo-ink-3">{group.label}</span>
                <span className="h-px flex-1 bg-holo-line-2" />
              </header>
              <ul className="flex flex-col gap-2">
                {group.items.map((c) => (
                  <li key={c}>
                    <button type="button" onClick={() => onSelect(c)} className={`flex h-[55px] w-full items-center justify-between rounded-holo-input border px-5 text-[15px] ${selected === c ? "border-2 border-holo-purple-mid text-holo-purple-mid" : "border-holo-line text-holo-ink"}`}>
                      <span>{c}</span>
                      {selected === c && <CheckIcon />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlreadyJoinedModal({ onLogin, onFindPassword, onClose }: any) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <div className="w-full max-w-[320px] rounded-[18px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-[16px] font-semibold text-holo-ink">이미 가입된 번호예요</p>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-holo-ink-3">휴대폰 번호 1개당 아이디 1개만 만들 수 있어요.<br />기존 계정으로 로그인하거나 비밀번호를 찾아보세요.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onLogin} className="h-[48px] w-full rounded-holo-pill bg-holo-gradient text-[14px] font-semibold text-white">로그인하기</button>
          <button type="button" onClick={onFindPassword} className="h-[48px] w-full rounded-holo-pill border border-holo-purple-mid text-[14px] font-semibold text-holo-purple-mid">비밀번호 찾기</button>
          <button type="button" onClick={onClose} className="h-[40px] w-full text-[13px] text-holo-ink-3">다른 번호로 다시 인증</button>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>; }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m4 12 6 6 10-14" /></svg>; }

// 마스킹 표시: "123456 - 1***" — 7번째 자리만 보이고 나머지는 실제 입력된 만큼만 *
function formatId(v: string) {
  if (!v) return "";
  if (v.length <= 6) return v;
  const seven = v.slice(6, 7);
  const hiddenCount = Math.max(0, v.length - 7);
  return `${v.slice(0, 6)} - ${seven}${"*".repeat(hiddenCount)}`;
}

// 미마스킹 표시: 전체 13자리 모두 노출
function formatIdRaw(v: string) {
  if (!v) return "";
  if (v.length <= 6) return v;
  return `${v.slice(0, 6)} - ${v.slice(6)}`;
}

// 입력 파서 — 마스킹 모드에서도 추가/삭제가 정상 동작하도록 prev와 diff 비교
function parseIdInput(displayValue: string, prevIdNum: string, masked: boolean) {
  if (!masked) {
    // 노출 모드: 그냥 숫자만 추출
    return displayValue.replace(/\D/g, "").slice(0, 13);
  }

  // 마스킹 모드
  const prevDisplay = formatId(prevIdNum);
  const newDigits = displayValue.replace(/\D/g, "");
  const prevDigits = prevDisplay.replace(/\D/g, "");
  const lenDiff = displayValue.length - prevDisplay.length;

  // 사용자가 문자(숫자)를 추가했음 → 가시 영역 뒤에 새 숫자가 추가된 것으로 간주하여 idNum에 append
  if (lenDiff > 0) {
    const addedDigits = newDigits.length - prevDigits.length;
    if (addedDigits > 0) {
      const additions = newDigits.slice(prevDigits.length);
      return (prevIdNum + additions).slice(0, 13);
    }
    return prevIdNum;
  }

  // 사용자가 문자(숫자 또는 *)를 삭제했음 → idNum 끝에서 그만큼 제거
  if (lenDiff < 0) {
    const removed = -lenDiff;
    return prevIdNum.slice(0, Math.max(0, prevIdNum.length - removed));
  }

  // 길이 동일 — 가시 영역의 숫자가 교체된 경우. 새 숫자 + 기존 숨김 결합
  return (newDigits + prevIdNum.slice(newDigits.length)).slice(0, 13);
}

function formatPhone(v: string) {
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
