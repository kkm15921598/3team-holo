import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CURRENT_EMAIL = "user@holo.app";

const VALID_TLDS = [
  "com", "net", "org", "kr", "jp", "io", "co", "edu", "gov",
  "biz", "info", "me", "ai", "app", "dev", "tv", "us", "cn",
];
const TLD_PATTERN = new RegExp(`\\.(${VALID_TLDS.join("|")})$`, "i");
const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && TLD_PATTERN.test(v);

export function EmailChangeScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = isValidEmail(email);
  const emailInvalid = email.length > 0 && !emailValid;
  const sameAsCurrent = email === CURRENT_EMAIL;
  const codeValid = code.length === 6;

  const handleSendCode = () => {
    if (emailValid && !sameAsCurrent) {
      setCodeSent(true);
      setCode("");
      setVerified(false);
    }
  };
  const handleVerify = () => codeValid && setVerified(true);
  const handleSubmit = () => verified && setDone(true);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          이메일 변경
        </span>
      </header>

      <section className="px-4 pt-2">
        <div className="rounded-holo-input bg-holo-lilac-card-2 px-4 py-3">
          <p className="text-[12px] text-holo-ink-3">현재 이메일</p>
          <p className="mt-0.5 text-[15px] font-semibold text-holo-ink">
            {CURRENT_EMAIL}
          </p>
        </div>
      </section>

      <section className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-[13px] text-holo-ink-3">
          새 이메일을 입력하면 인증 메일을 보내드려요.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="새 이메일 입력"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.slice(0, 50));
                if (codeSent) {
                  setCodeSent(false);
                  setCode("");
                  setVerified(false);
                }
              }}
              disabled={verified}
              maxLength={50}
              className={`h-[58px] flex-1 rounded-holo-input px-5 text-[15px] outline-none ${
                emailInvalid || sameAsCurrent
                  ? "border-2 border-holo-error"
                  : emailValid
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              } ${verified ? "bg-holo-line-2/50" : ""}`}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!emailValid || sameAsCurrent || verified}
              className={`h-[58px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold ${
                emailValid && !sameAsCurrent && !verified
                  ? "bg-holo-ink text-white active:scale-[0.98]"
                  : "bg-holo-ink-4 text-white"
              }`}
            >
              {codeSent && !verified ? "재전송" : "인증요청"}
            </button>
          </div>
          {emailInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              올바른 이메일 형식으로 입력해주세요.
            </p>
          )}
          {sameAsCurrent && (
            <p className="pl-2 text-[13px] text-holo-error">
              현재 이메일과 다른 값을 입력해주세요.
            </p>
          )}

          {codeSent && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="인증번호 6자리"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={verified}
                    className={`h-[58px] w-full rounded-holo-input px-5 pr-14 text-[15px] outline-none ${
                      verified || codeValid
                        ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                        : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
                    }`}
                  />
                  {!verified && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] text-holo-error">
                      04:59
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={!codeValid || verified}
                  className={`h-[58px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold ${
                    verified
                      ? "bg-holo-purple-mid text-white"
                      : codeValid
                        ? "bg-holo-ink text-white active:scale-[0.98]"
                        : "bg-holo-ink-4 text-white"
                  }`}
                >
                  {verified ? "인증완료" : "인증"}
                </button>
              </div>
              {verified && (
                <p className="pl-2 text-[13px] text-holo-purple-mid">
                  이메일 인증이 완료되었어요.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pb-4 pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!verified}
            className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
              verified ? "bg-holo-ink" : "bg-holo-ink-4"
            }`}
          >
            이메일 변경하기
          </button>
        </div>
      </section>

      {done && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[300px] rounded-[14px] bg-white p-5 text-center">
            <p className="text-[14px] font-semibold text-holo-ink">
              이메일이 변경되었어요!
            </p>
            <p className="mt-2 text-[12px] text-holo-ink-3">
              새 이메일 {email} 로 등록되었습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                navigate(-1);
              }}
              className="mt-4 h-10 w-full rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
