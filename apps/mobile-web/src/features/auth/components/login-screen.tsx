import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "@/shared/auth/auth-context";

type FromLocationState = { from?: Location };

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Supabase Auth 연결 (현재는 mock)
    signIn(email);
    const state = location.state as FromLocationState | null;
    const redirectTo = state?.from?.pathname ?? "/";
    navigate(redirectTo, { replace: true });
  };

  return (
    <main className="flex flex-1 flex-col px-6 pb-8 pt-16">
      {/* Logo */}
      <div className="mb-12 flex flex-col items-center gap-3">
        <LogoPlaceholder />
        <h1 className="font-fredoka text-[40px] font-semibold leading-none tracking-tight text-holo-purple">
          HOLO
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <InputField
          type="email"
          placeholder="이메일 (아이디) 입력"
          value={email}
          onChange={setEmail}
          icon={<MailIcon />}
        />
        <InputField
          type="password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={setPassword}
          icon={<LockIcon />}
        />

        <button
          type="submit"
          className="mt-3 h-12 rounded-full bg-holo-gradient text-base font-semibold text-white shadow-md transition active:scale-[0.99]"
        >
          로그인
        </button>
      </form>

      {/* Divider */}
      <div className="my-7 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span>또는</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Social */}
      <div className="flex justify-center gap-5">
        <SocialButton provider="google" />
        <SocialButton provider="kakao" />
        <SocialButton provider="naver" />
      </div>

      {/* Footer */}
      <nav className="mt-auto flex items-center justify-center gap-4 pt-10 text-xs text-gray-500">
        <FooterLink>회원가입</FooterLink>
        <span className="h-3 w-px bg-gray-300" />
        <FooterLink>아이디 찾기</FooterLink>
        <span className="h-3 w-px bg-gray-300" />
        <FooterLink>비밀번호 찾기</FooterLink>
      </nav>
    </main>
  );
}

function LogoPlaceholder() {
  // 실제 로고 이미지가 들어올 자리. 받으면 <img src={holoLogo} ... /> 로 교체.
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-200 text-[10px] font-medium uppercase tracking-wider text-gray-500"
      aria-label="HOLO 로고 이미지 자리"
    >
      LOGO
    </div>
  );
}

type InputFieldProps = {
  type: "email" | "password";
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
};

function InputField({ type, placeholder, value, onChange, icon }: InputFieldProps) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 focus-within:border-holo-purple focus-within:bg-white">
      <span className="text-gray-400">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
      />
    </label>
  );
}

function SocialButton({ provider }: { provider: "google" | "kakao" | "naver" }) {
  const styles: Record<typeof provider, string> = {
    google: "bg-white border border-gray-200",
    kakao: "bg-[#FEE500]",
    naver: "bg-[#03C75A]",
  };

  return (
    <button
      type="button"
      aria-label={`${provider} 로그인`}
      onClick={() => alert(`${provider} 로그인 (mock)`)}
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
        <path
          fill="#4285F4"
          d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.22-4.74 3.22-8.32z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.67-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        />
      </svg>
    );
  }
  if (provider === "kakao") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#191919"
          d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.86 5.31 4.66 6.74L5.5 22l4.4-2.62c.69.09 1.39.14 2.1.14 5.52 0 10-3.58 10-8S17.52 3 12 3z"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FFFFFF"
        d="M16.27 12.86 7.74 1H1v22h6.74V11.14L16.27 23H23V1h-6.73z"
      />
    </svg>
  );
}

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="hover:text-gray-700">
      {children}
    </button>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
