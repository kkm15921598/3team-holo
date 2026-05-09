import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "@/shared/hooks/use-countdown";

const MOCK_NAME = "홍길동";
const MOCK_PHONE = "01012345678";

const MOCK_FOUND = {
  id: "test1234",
  joinedAt: "2024.03.15",
};

export function FindIdScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { formatted: codeTimer, expired: codeExpired, restart: restartTimer } =
    useCountdown(180, codeSent && !foundId);

  const isNameValid = name.trim().length > 0;
  const isPhoneValid = phone.length >= 10;
  const baseFilled = isNameValid && isPhoneValid;
  const canSubmit = codeSent ? code.length >= 6 : baseFilled;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!codeSent) {
      if (!baseFilled) return;
      setCodeSent(true);
      return;
    }

    if (code.length < 6) return;
    if (codeExpired) {
      setError("인증 시간이 만료되었습니다. 재전송해주세요.");
      return;
    }

    if (name.trim() === MOCK_NAME && phone === MOCK_PHONE && code === "123456") {
      setFoundId(MOCK_FOUND.id);
    } else {
      setError("일치하는 정보를 찾을 수 없습니다.");
    }
  };

  const handleResendCode = () => {
    setCode("");
    setError("");
    restartTimer();
  };

  if (foundId) {
    return (
      <main className="flex flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center px-4">
          <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
            <BackIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-8 pt-7">
          <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
            아이디 찾기 결과
          </h1>
          <p className="mt-2 text-[14px] text-holo-ink-3">
            입력하신 정보로 가입된 아이디입니다.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center rounded-holo-input border border-holo-line-2 bg-holo-purple/5 px-5 py-10">
            <p className="text-[13px] text-holo-ink-3">회원님의 아이디</p>
            <p className="mt-3 text-[20px] font-bold text-holo-purple-mid">
              {foundId}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/70 px-3 py-1">
              <CalendarIcon />
              <span className="text-[12px] text-holo-ink-3">
                <span className="text-holo-ink">{MOCK_FOUND.joinedAt}</span> 가입
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="h-[60px] w-full rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99]"
            >
              로그인하기
            </button>
            <button
              type="button"
              onClick={() => navigate("/auth/find-password", { replace: true })}
              className="h-[60px] w-full rounded-holo-pill border border-holo-purple-mid text-[16px] font-semibold text-holo-purple-mid transition active:scale-[0.99]"
            >
              비밀번호 찾기
            </button>
          </div>
        </div>
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
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col px-4 pb-8 pt-7"
      >
        <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
          가입 시 등록한 정보로
          <br />
          아이디를 찾아드릴게요.
        </h1>
        <p className="mt-2 text-[14px] text-holo-ink-3">
          이름과 휴대폰 번호로 본인 확인을 진행합니다.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Input
            placeholder="이름 입력 (홍길동)"
            value={name}
            onChange={(v) => {
              setName(v.slice(0, 20));
              setError("");
            }}
            valid={isNameValid}
            maxLength={20}
          />
          <Input
            placeholder="휴대폰 번호 입력 (010-1234-5678)"
            value={formatPhone(phone)}
            onChange={(v) => {
              setPhone(v.replace(/\D/g, "").slice(0, 11));
              setError("");
            }}
            inputMode="numeric"
            autoComplete="tel"
            valid={isPhoneValid}
          />
          {codeSent && (
            <div className="flex flex-col gap-1">
              <div className="relative">
                <Input
                  placeholder="인증번호 입력 (123456)"
                  value={code}
                  onChange={(v) => {
                    setCode(v.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  valid={code.length === 6}
                  error={!!error}
                />
                <span className="pointer-events-none absolute right-5 top-[31px] -translate-y-1/2 text-[13px] text-holo-error">
                  {codeTimer}
                </span>
              </div>
              {error && (
                <p className="pl-2 text-[13px] text-holo-error">{error}</p>
              )}
              {!error && codeExpired && (
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
            type="submit"
            disabled={!canSubmit}
            className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
              canSubmit ? "bg-holo-gradient shadow-md" : "bg-holo-ink-4"
            }`}
          >
            {codeSent ? "아이디 찾기" : "인증번호 받기"}
          </button>
        </div>
      </form>
    </main>
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

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function formatPhone(v: string) {
  if (!v) return "";
  if (v.length < 4) return v;
  if (v.length < 8) return `${v.slice(0, 3)}-${v.slice(3)}`;
  return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
}
