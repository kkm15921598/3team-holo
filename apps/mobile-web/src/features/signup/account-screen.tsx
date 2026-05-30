import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CapsLockBadge } from "@/shared/components/caps-lock-badge";
import { useCapsLock } from "@/shared/hooks/use-caps-lock";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

/**
 * 비밀번호 input 우측 눈 아이콘 — 항상 회색(holo-ink-4) 고정.
 * 입력값 유효 상태와 무관하게 색이 바뀌지 않도록 자체적으로 색을 지정.
 */
function GrayPasswordToggle({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? "비밀번호 가리기" : "비밀번호 보이기"}
      aria-pressed={visible}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-holo-ink-4"
    >
      {visible ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
      )}
    </button>
  );
}

const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,16}$/;

/** 비밀번호가 충족하는 조건 개수로 강도 레벨(0~4) 산출. */
function getPasswordStrength(pw: string): {
  level: 0 | 1 | 2 | 3 | 4;
  hasLength: boolean;
  hasLetter: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
} {
  const hasLength = pw.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]/.test(pw);
  const count = [hasLength, hasLetter, hasDigit, hasSpecial].filter(Boolean).length;
  return {
    level: count as 0 | 1 | 2 | 3 | 4,
    hasLength,
    hasLetter,
    hasDigit,
    hasSpecial,
  };
}

const STRENGTH_LABELS = ["", "약함", "보통", "강함", "매우 강함"] as const;
const STRENGTH_COLORS = [
  "text-holo-ink-3",
  "text-holo-error",
  "text-[#F4A100]",
  "text-[#2E9B5A]",
  "text-holo-purple-mid",
] as const;

export function AccountScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();

  const password = data.password;

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  // Caps Lock 안내 — 두 input 각각 따로 감지 (blur 시 자동 리셋).
  const pwCaps = useCapsLock();
  const pwConfirmCaps = useCapsLock();

  const passwordValid = PASSWORD_PATTERN.test(password);
  const passwordInvalid = password.length > 0 && !passwordValid;
  const strength = getPasswordStrength(password);
  const passwordMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const canSubmit = passwordValid && passwordMatch;
  // 다음 버튼 비활성 상태에서 눌렀을 때 빠진 항목을 안내하는 인라인 문구(알림창 대신).
  const [nextHint, setNextHint] = useState<string | null>(null);

  return (
    <SignupLayout step={3}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        로그인에 사용할
        <br />
        비밀번호를 만들어 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        다른 사이트와 동일한 비밀번호 사용은 피해주세요.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="비밀번호 (영문 + 숫자 8~16자)"
              value={password}
              onChange={(e) => update("password", e.target.value.slice(0, 16))}
              maxLength={16}
              onKeyDown={pwCaps.capsHandlers.onKeyDown}
              onKeyUp={pwCaps.capsHandlers.onKeyUp}
              onBlur={pwCaps.capsHandlers.onBlur}
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                passwordInvalid
                  ? "border-2 border-holo-error"
                  : passwordValid
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <GrayPasswordToggle visible={showPw} onClick={() => setShowPw((s) => !s)} />
          </div>
          <CapsLockBadge visible={pwCaps.capsOn} />
          {passwordInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              영문과 숫자를 모두 포함해 8~16자로 입력해 주세요.
            </p>
          )}

          {/* 강도 표시기 + 조건 체크리스트 — 입력값이 있을 때만 노출. */}
          {password.length > 0 && (
            <div className="mt-2">
              {/* 강도 막대 — 4칸으로 분리, 충족된 조건 수만큼 색이 채워짐 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1">
                  {[1, 2, 3, 4].map((i) => {
                    const filled = strength.level >= i;
                    const color =
                      strength.level === 1
                        ? "bg-holo-error"
                        : strength.level === 2
                          ? "bg-[#F4A100]"
                          : strength.level === 3
                            ? "bg-[#2E9B5A]"
                            : "bg-holo-purple-mid";
                    return (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          filled ? color : "bg-holo-line-3"
                        }`}
                      />
                    );
                  })}
                </div>
                <span
                  className={`shrink-0 text-[11px] font-semibold ${STRENGTH_COLORS[strength.level]}`}
                >
                  {STRENGTH_LABELS[strength.level]}
                </span>
              </div>

              {/* 조건 체크리스트 — 각 조건 충족 여부를 색·체크로 표시 */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <ConditionItem ok={strength.hasLength} label="8자 이상" />
                <span className="text-holo-line-2">·</span>
                <ConditionItem ok={strength.hasLetter} label="영문 포함" />
                <span className="text-holo-line-2">·</span>
                <ConditionItem ok={strength.hasDigit} label="숫자 포함" />
                <span className="text-holo-line-2">·</span>
                <ConditionItem
                  ok={strength.hasSpecial}
                  label="특수문자 (권장)"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              type={showPwConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              maxLength={16}
              onKeyDown={pwConfirmCaps.capsHandlers.onKeyDown}
              onKeyUp={pwConfirmCaps.capsHandlers.onKeyUp}
              onBlur={pwConfirmCaps.capsHandlers.onBlur}
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                passwordMismatch
                  ? "border-2 border-holo-error"
                  : passwordMatch
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <GrayPasswordToggle visible={showPwConfirm} onClick={() => setShowPwConfirm((s) => !s)} />
          </div>
          <CapsLockBadge visible={pwConfirmCaps.capsOn} />
          {passwordMismatch && (
            <p className="pl-2 text-[13px] text-holo-error">
              비밀번호가 일치하지 않아요.
            </p>
          )}
          {passwordMatch && (
            <p className="pl-2 text-[13px] text-holo-purple-mid">
              비밀번호가 일치해요.
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        {nextHint && !canSubmit && (
          <p className="mb-2 text-center text-[13px] font-medium text-holo-error">
            {nextHint}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            // 비활성이어도 클릭을 받아 빠진 항목을 안내(첫 미충족 항목 우선).
            if (password.length === 0) {
              setNextHint("비밀번호를 입력해 주세요.");
              return;
            }
            if (!passwordValid) {
              setNextHint("비밀번호 형식을 확인해 주세요.");
              return;
            }
            if (!passwordMatch) {
              setNextHint("비밀번호가 일치하지 않아요.");
              return;
            }
            setNextHint(null);
            navigate("/signup/nickname");
          }}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canSubmit ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>
    </SignupLayout>
  );
}

/**
 * 비밀번호 조건 항목 — 충족하면 보라 체크, 미충족이면 회색 점.
 */
function ConditionItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${
        ok ? "font-semibold text-holo-purple-mid" : "text-holo-ink-3"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "·"}</span>
      {label}
    </span>
  );
}
