import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "@/shared/hooks/use-countdown";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { PasswordStrength } from "@/shared/components/password-strength";
import { CapsLockBadge } from "@/shared/components/caps-lock-badge";
import { useCapsLock } from "@/shared/hooks/use-caps-lock";
import { supabase } from "@/shared/lib/supabaseClient";

// 데모용: 실제 SMS 발송 없이 가짜 6자리 인증번호를 생성.
// 실제 SMS API 연동 전까지 사용. 코드 생성 시 토스트로 보여줌.
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

type Step = "verify" | "reset" | "done";

export function FindPasswordScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("verify");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showSmsToast, setShowSmsToast] = useState(false);

  const { formatted: codeTimer, expired: codeExpired, restart: restartTimer } =
    useCountdown(180, codeSent && step === "verify");

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const newPwCaps = useCapsLock();
  const confirmPwCaps = useCapsLock();

  // 가입 시 검증과 동일: 한글 완성형(가-힣) 또는 영문 알파벳, 단어 사이 1칸 공백 허용.
  // 총 2~20자.
  const isNameValid =
    /^[가-힣a-zA-Z]+(?:\s[가-힣a-zA-Z]+)*$/.test(name) &&
    name.length >= 2 &&
    name.length <= 20;
  // 표준 휴대폰 번호: 010 (11자) 또는 011·016·017·018·019 (10~11자)
  const PHONE_PATTERN = /^01(?:0\d{8}|[16789]\d{7,8})$/;
  const isPhoneValid = PHONE_PATTERN.test(phone);
  const showPhoneError = phone.length >= 3 && !/^01[016789]/.test(phone);
  const baseFilled = isNameValid && isPhoneValid;
  const canSubmitVerify = codeSent ? code.length >= 6 : baseFilled;

  const PW_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,16}$/;
  const isPwValid = PW_PATTERN.test(newPw);
  const isPwMatch = !!confirmPw && newPw === confirmPw;
  const canSubmitReset = isPwValid && isPwMatch;

  const handleVerifySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setVerifyError("");

    if (!codeSent) {
      if (!baseFilled) return;
      // Supabase에서 이름+번호 일치 여부 확인
      const { data: dbUser } = await supabase
        .from("users")
        .select("phone")
        .eq("name", name.trim())
        .eq("phone", phone)
        .maybeSingle();

      if (!dbUser) {
        setVerifyError("입력하신 정보와 일치하는 계정을 찾을 수 없습니다.");
        return;
      }

      // 가짜 SMS 발송: 무작위 6자리 코드 생성 + 토스트 노출
      const otp = generateOtp();
      setGeneratedCode(otp);
      setShowSmsToast(true);
      setTimeout(() => setShowSmsToast(false), 10000);
      setCodeSent(true);
      return;
    }

    if (code.length < 6) return;
    if (codeExpired) {
      setVerifyError("인증 시간이 만료되었습니다. 재전송해주세요.");
      return;
    }

    if (code === generatedCode) {
      setStep("reset");
    } else {
      setVerifyError("인증번호가 올바르지 않습니다.");
    }
  };

  const handleResendCode = () => {
    const otp = generateOtp();
    setGeneratedCode(otp);
    setShowSmsToast(true);
    setTimeout(() => setShowSmsToast(false), 10000);
    setCode("");
    setVerifyError("");
    restartTimer();
  };

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwError("");

    if (!isPwValid) {
      setPwError("영문, 숫자를 포함한 8~16자로 입력해주세요.");
      return;
    }
    if (!isPwMatch) {
      setPwError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // Supabase users 테이블 비밀번호 실제 업데이트
    await supabase
      .from("users")
      .update({ password: newPw })
      .eq("name", name.trim())
      .eq("phone", phone);

    setStep("done");
  };

  if (step === "done") {
    return (
      <main className="flex flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center px-4" />

        <div className="flex flex-1 flex-col px-4 pb-8 pt-7">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-holo-purple/10">
              <CheckCircleIcon />
            </div>
            <h1 className="mt-6 text-[20px] font-bold text-holo-ink">
              비밀번호가 변경되었어요
            </h1>
            <p className="mt-2 text-center text-[14px] text-holo-ink-3">
              새 비밀번호로 다시 로그인해주세요.
            </p>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="h-[60px] w-full rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99]"
            >
              로그인하러 가기
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "reset") {
    return (
      <main className="flex flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center px-4">
          <button
            type="button"
            aria-label="뒤로"
            onClick={() => setStep("verify")}
          >
            <BackIcon />
          </button>
        </div>

        <form
          onSubmit={handleResetSubmit}
          className="flex flex-1 flex-col px-4 pb-8 pt-7"
        >
          <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
            새로운 비밀번호를
            <br />
            설정해주세요.
          </h1>
          <p className="mt-2 text-[14px] text-holo-ink-3">
            영문과 숫자를 포함해 8~16자로 입력해 주세요.
          </p>
          <p className="mt-1 text-[12px] text-holo-purple-mid">
            ※ 이전에 사용하던 비밀번호와 다르게 설정해 주세요.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  placeholder="새 비밀번호 입력"
                  value={newPw}
                  onChange={(e) => {
                    setNewPw(e.target.value.slice(0, 16));
                    setPwError("");
                  }}
                  onKeyDown={newPwCaps.capsHandlers.onKeyDown}
                  onKeyUp={newPwCaps.capsHandlers.onKeyUp}
                  onBlur={newPwCaps.capsHandlers.onBlur}
                  maxLength={16}
                  className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none ${
                    isPwValid
                      ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                      : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
                  }`}
                />
                <PasswordToggle visible={showNewPw} onClick={() => setShowNewPw((s) => !s)} />
              </div>
              <CapsLockBadge visible={newPwCaps.capsOn} />
              <PasswordStrength password={newPw} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="새 비밀번호 확인"
                  value={confirmPw}
                  onChange={(e) => {
                    setConfirmPw(e.target.value.slice(0, 16));
                    setPwError("");
                  }}
                  onKeyDown={confirmPwCaps.capsHandlers.onKeyDown}
                  onKeyUp={confirmPwCaps.capsHandlers.onKeyUp}
                  onBlur={confirmPwCaps.capsHandlers.onBlur}
                  maxLength={16}
                  className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none ${
                    confirmPw && !isPwMatch
                      ? "border-2 border-holo-error"
                      : isPwMatch
                        ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                        : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
                  }`}
                />
                <PasswordToggle
                  visible={showConfirmPw}
                  onClick={() => setShowConfirmPw((s) => !s)}
                />
              </div>
              <CapsLockBadge visible={confirmPwCaps.capsOn} />
              {pwError && (
                <p className="pl-2 text-[13px] text-holo-error">{pwError}</p>
              )}
              {isPwMatch && !pwError && (
                <p className="pl-2 text-[13px] text-holo-purple-mid">
                  비밀번호가 일치해요.
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button
              type="submit"
              disabled={!canSubmitReset}
              className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
                canSubmitReset ? "bg-holo-gradient shadow-md" : "bg-holo-ink-4"
              }`}
            >
              비밀번호 변경
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
      </div>

      <form
        onSubmit={handleVerifySubmit}
        className="flex flex-1 flex-col px-4 pb-8 pt-7"
      >
        <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
          비밀번호를 잊으셨나요?
          <br />
          본인 확인 후 재설정할 수 있어요.
        </h1>
        <p className="mt-2 text-[14px] text-holo-ink-3">
          가입한 이름과 휴대폰 번호를 입력해주세요.
        </p>
        <p className="mt-1 text-[12px] text-holo-purple-mid">
          ※ 본인 확인을 통과해야 새 비밀번호를 설정할 수 있어요.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Input
            placeholder="이름 입력 (한글/영문, 2~20자)"
            value={name}
            onChange={(v) => {
              // 한글 스크립트 전체(천지인 "·" 포함) + 영문 + 공백 허용.
              // 연속 공백 압축 + 20자 제한.
              const filtered = v
                .replace(/[^\p{Script=Hangul}·a-zA-Z\s]/gu, "")
                .replace(/\s{2,}/g, " ")
                .slice(0, 20);
              setName(filtered);
              setVerifyError("");
            }}
            inputMode="text"
            autoComplete="name"
            valid={isNameValid}
            maxLength={20}
          />
          <div className="flex flex-col gap-1">
            <Input
              placeholder="휴대폰 번호 입력"
              value={formatPhone(phone)}
              onChange={(v) => {
                setPhone(v.replace(/\D/g, "").slice(0, 11));
                setVerifyError("");
              }}
              inputMode="numeric"
              autoComplete="tel"
              valid={isPhoneValid}
              error={showPhoneError}
            />
            {showPhoneError && (
              <p className="pl-2 text-[12px] text-holo-error">
                010·011·016·017·018·019 로 시작하는 번호여야 합니다.
              </p>
            )}
          </div>

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
                <span className="pointer-events-none absolute right-5 top-[31px] -translate-y-1/2 text-[13px] text-holo-error">
                  {codeTimer}
                </span>
              </div>
              {verifyError && (
                <p className="pl-2 text-[13px] text-holo-error">
                  {verifyError}
                </p>
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
          {!codeSent && verifyError && (
            <p className="pl-2 text-[13px] text-holo-error">{verifyError}</p>
          )}
        </div>

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={!canSubmitVerify}
            className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
              canSubmitVerify ? "bg-holo-gradient shadow-md" : "bg-holo-ink-4"
            }`}
          >
            {codeSent ? "확인" : "인증번호 받기"}
          </button>
        </div>
      </form>

      {showSmsToast && (
        <SmsToast
          code={generatedCode}
          onClose={() => setShowSmsToast(false)}
        />
      )}
    </main>
  );
}

/**
 * 가짜 SMS 알림 토스트.
 * 실제 SMS API 연동 전까지 데모용으로 화면 상단에 iOS/Android 알림처럼 노출.
 */
function SmsToast({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      onClick={onClose}
      className="fixed left-1/2 top-4 z-[1100] w-[92%] max-w-[340px] -translate-x-1/2 cursor-pointer rounded-2xl bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-holo-purple-mid text-[16px] font-bold text-white">
          H
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-holo-ink">HOLO</span>
            <span className="shrink-0 text-[11px] text-holo-ink-3">방금</span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-holo-ink">
            [HOLO] 본인확인 인증번호는{" "}
            <span className="font-bold text-holo-purple-mid">{code}</span> 입니다.
            정확히 입력해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  inputMode,
  error,
  valid,
  maxLength,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "email";
  error?: boolean;
  valid?: boolean;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <input
      type="text"
      inputMode={inputMode ?? "text"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className={`h-[62px] rounded-holo-input px-5 text-[15px] outline-none ${
        error
          ? "border-2 border-holo-error"
          : valid
            ? "border-2 border-holo-purple-mid text-holo-purple-mid"
            : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
      }`}
    />
  );
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function formatPhone(v: string) {
  if (!v) return "";
  if (v.length < 4) return v;
  if (v.length < 8) return `${v.slice(0, 3)}-${v.slice(3)}`;
  return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
}
