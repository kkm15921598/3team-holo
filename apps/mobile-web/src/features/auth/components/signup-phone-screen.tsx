import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/features/auth/signup-context";

const TIMER_SECONDS = 60;

export function SignupPhoneScreen() {
  const { state, patch } = useSignup();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  useEffect(() => {
    if (code.length === 6 && !state.phoneVerified) {
      patch({ phoneVerified: true });
    }
    if (code.length < 6 && state.phoneVerified) {
      patch({ phoneVerified: false });
    }
  }, [code, state.phoneVerified, patch]);

  const phoneDigitsOk = state.phone.replace(/\D/g, "").length >= 10;
  const sent = remaining !== null;
  const canResend = sent && remaining === 0;

  const sendCode = () => {
    setCode("");
    patch({ phoneVerified: false });
    setRemaining(TIMER_SECONDS);
  };

  return (
    <div className="flex flex-1 flex-col px-6 pb-6 pt-8">
      <p className="text-xl font-semibold leading-tight text-gray-900">
        휴대폰 번호를
        <br />
        인증해주세요
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-700">휴대폰 번호</span>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="numeric"
              value={state.phone}
              onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              placeholder="01012345678"
              className="h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-holo-purple focus:bg-white"
            />
            <button
              type="button"
              disabled={!phoneDigitsOk || (sent && !canResend)}
              onClick={sendCode}
              className={`h-12 shrink-0 rounded-2xl px-4 text-xs font-semibold transition ${
                phoneDigitsOk && (!sent || canResend)
                  ? "bg-holo-purple-light text-holo-purple-deep"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {sent ? (canResend ? "다시 보내기" : "재전송") : "인증번호 받기"}
            </button>
          </div>
        </label>

        {sent && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-700">인증번호</span>
            <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-holo-purple focus-within:bg-white">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6자리 입력"
                className="flex-1 bg-transparent text-sm tracking-[0.3em] outline-none placeholder:tracking-normal"
              />
              <span className={`ml-2 text-xs font-medium ${remaining! > 0 ? "text-holo-purple" : "text-gray-400"}`}>
                {formatTimer(remaining ?? 0)}
              </span>
            </div>
            {state.phoneVerified ? (
              <span className="text-[11px] font-medium text-emerald-500">인증 완료</span>
            ) : (
              <span className="text-[11px] text-gray-400">
                테스트용입니다. 아무 6자리나 입력하면 통과돼요.
              </span>
            )}
          </label>
        )}
      </div>

      <button
        type="button"
        disabled={!state.phoneVerified}
        onClick={() => navigate("/signup/address")}
        className={`mt-auto h-12 rounded-full text-sm font-semibold transition ${
          state.phoneVerified
            ? "bg-holo-gradient text-white shadow-md active:scale-[0.99]"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        다음
      </button>
    </div>
  );
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
