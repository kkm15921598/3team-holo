import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const MOCK_EMAIL = "test@gmail.com";
const MOCK_PASSWORD = "test1234";

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
<<<<<<< HEAD
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      navigate("/home", { replace: true });
    } else {
      setError(true);
=======
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");

  const VALID_TLDS = [
    "com",
    "net",
    "org",
    "kr",
    "jp",
    "io",
    "co",
    "edu",
    "gov",
    "biz",
    "info",
    "me",
    "ai",
    "app",
    "dev",
    "tv",
    "us",
    "cn",
  ];
  const TLD_PATTERN = new RegExp(`\\.(${VALID_TLDS.join("|")})$`, "i");
  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && TLD_PATTERN.test(value);

  const clearErrors = () => {
    setEmailError(false);
    setPasswordError(false);
    setEmailErrorMessage("");
    setPasswordErrorMessage("");
  };

  const handleEmailBlur = () => {
    if (email && !isValidEmail(email)) {
      setEmailError(true);
      setEmailErrorMessage("이메일을 다시 입력해주세요.");
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setEmailError(true);
      setPasswordError(true);
      setPasswordErrorMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError(true);
      setEmailErrorMessage("이메일을 다시 입력해주세요.");
      return;
    }
    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      navigate("/home", { replace: true });
    } else {
      setEmailError(false);
      setPasswordError(true);
      setPasswordErrorMessage("비밀번호를 다시 확인해 주세요.");
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa
    }
  };

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-20">
      <div className="mb-12 flex flex-col items-center">
        <span className="font-fredoka text-[44px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
<<<<<<< HEAD
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일 (test@gmail.com)"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(false);
          }}
          className="h-[62px] rounded-holo-input border border-holo-ink-4 px-5 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
        />
=======
        <div className="flex flex-col gap-1">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="이메일 (test@gmail.com)"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.slice(0, 50));
              clearErrors();
            }}
            onBlur={handleEmailBlur}
            maxLength={50}
            className={`h-[62px] rounded-holo-input px-5 text-[15px] outline-none ${
              emailError
                ? "border-2 border-holo-error"
                : email && isValidEmail(email)
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {emailErrorMessage && (
            <p className="pl-2 text-[13px] text-holo-error">{emailErrorMessage}</p>
          )}
        </div>
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa
        <div className="flex flex-col gap-1">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호 (test1234)"
            value={password}
            onChange={(e) => {
<<<<<<< HEAD
              setPassword(e.target.value);
              setError(false);
            }}
            className={`h-[62px] rounded-holo-input border px-5 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 ${
              error
                ? "border-2 border-holo-error"
                : "border-holo-ink-4 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {error && (
            <p className="pl-2 text-[13px] text-holo-error">비밀번호를 다시 확인해 주세요.</p>
=======
              setPassword(e.target.value.slice(0, 16));
              clearErrors();
            }}
            maxLength={16}
            className={`h-[62px] rounded-holo-input px-5 text-[15px] outline-none ${
              passwordError
                ? "border-2 border-holo-error"
                : password
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {passwordErrorMessage && (
            <p className="pl-2 text-[13px] text-holo-error">{passwordErrorMessage}</p>
>>>>>>> 46c84a5f3cbe41fddf3c74c072c05038e30320aa
          )}
        </div>

        <button
          type="submit"
          className="mt-3 h-[60px] rounded-holo-pill bg-holo-gradient text-[16px] font-semibold text-white shadow-md transition active:scale-[0.99]"
        >
          로그인
        </button>
      </form>

      <div className="my-7 flex items-center gap-3 text-[12px] text-holo-ink-4">
        <span className="h-px flex-1 bg-holo-line-2" />
        <span>또는</span>
        <span className="h-px flex-1 bg-holo-line-2" />
      </div>

      <div className="flex justify-center gap-5">
        <SocialButton provider="google" />
        <SocialButton provider="kakao" />
        <SocialButton provider="naver" />
      </div>

      <nav className="mt-auto flex items-center justify-center gap-4 pt-10 text-[12px] text-holo-ink-3">
        <button type="button" onClick={() => navigate("/signup/terms")}>
          회원가입
        </button>
        <span className="h-3 w-px bg-holo-line" />
        <button type="button">아이디 찾기</button>
        <span className="h-3 w-px bg-holo-line" />
        <button type="button">비밀번호 찾기</button>
      </nav>
    </main>
  );
}

function SocialButton({ provider }: { provider: "google" | "kakao" | "naver" }) {
  const styles = {
    google: "bg-white border border-holo-line",
    kakao: "bg-[#FEE500]",
    naver: "bg-[#03C75A]",
  } as const;
  return (
    <button
      type="button"
      aria-label={`${provider} 로그인`}
      className={`flex h-12 w-12 items-center justify-center rounded-full ${styles[provider]} transition active:scale-95`}
    >
      <SocialIcon provider={provider} />
    </button>
  );
}

function SocialIcon({ provider }: { provider: "google" | "kakao" | "naver" }) {
  if (provider === "google") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.67-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
    );
  }
  if (provider === "kakao") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.31 4.66 6.74L5.5 22l4.4-2.62c.69.09 1.39.14 2.1.14 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#FFFFFF" d="M16.27 12.86 7.74 1H1v22h6.74V11.14L16.27 23H23V1h-6.73z" />
    </svg>
  );
}
