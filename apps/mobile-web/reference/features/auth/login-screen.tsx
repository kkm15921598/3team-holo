import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GradientButton } from "@/shared/components/gradient-button";

const MOCK_EMAIL = "test@gmail.com";
const MOCK_PASSWORD = "test1234";

export function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email === MOCK_EMAIL && password === MOCK_PASSWORD) {
      navigate("/home", { replace: true });
    } else {
      setError("비밀번호를 다시 확인해 주세요.");
    }
  };

  return (
    <main className="flex flex-1 flex-col px-6 pb-8 pt-16">
      <div className="mb-12 flex flex-col items-center">
        <span className="font-fredoka text-[40px] font-semibold leading-none text-holo-purple">
          HOLO
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="이메일 (test@gmail.com)"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="h-[52px] rounded-holo-input border border-holo-ink-4 px-4 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid"
        />
        <input
          type="password"
          placeholder="비밀번호 (test1234)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          className={`h-[52px] rounded-holo-input border px-4 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid ${
            error ? "border-holo-error" : "border-holo-ink-4"
          }`}
        />
        {error && <p className="text-[13px] text-holo-error">{error}</p>}

        <GradientButton type="submit" className="mt-3">
          로그인
        </GradientButton>
      </form>

      <div className="my-7 flex items-center gap-3 text-[12px] text-holo-ink-4">
        <span className="h-px flex-1 bg-holo-line-2" />
        <span>또는</span>
        <span className="h-px flex-1 bg-holo-line-2" />
      </div>

      <nav className="mt-auto flex items-center justify-center gap-4 pt-10 text-[12px] text-holo-ink-3">
        <button type="button" onClick={() => navigate("/signup/terms")}>회원가입</button>
        <span className="h-3 w-px bg-holo-line" />
        <button type="button">아이디 찾기</button>
        <span className="h-3 w-px bg-holo-line" />
        <button type="button">비밀번호 찾기</button>
      </nav>
    </main>
  );
}
