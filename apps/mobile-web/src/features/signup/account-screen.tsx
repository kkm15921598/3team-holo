import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,16}$/;

export function AccountScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();

  const password = data.password;

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const passwordValid = PASSWORD_PATTERN.test(password);
  const passwordInvalid = password.length > 0 && !passwordValid;
  const passwordMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const canSubmit = passwordValid && passwordMatch;

  return (
    <SignupLayout step={3}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        로그인에 사용할
        <br />
        비밀번호를 만들어 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        영문과 숫자를 포함해 8~16자로 입력해 주세요.
      </p>
      <p className="mt-1 text-[12px] text-holo-purple-mid">
        ※ 다른 사이트와 동일한 비밀번호 사용은 피해주세요.
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
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none ${
                passwordInvalid
                  ? "border-2 border-holo-error"
                  : passwordValid
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <PasswordToggle visible={showPw} onClick={() => setShowPw((s) => !s)} />
          </div>
          {passwordInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              영문과 숫자를 모두 포함해 8~16자로 입력해 주세요.
            </p>
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
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none ${
                passwordMismatch
                  ? "border-2 border-holo-error"
                  : passwordMatch
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <PasswordToggle visible={showPwConfirm} onClick={() => setShowPwConfirm((s) => !s)} />
          </div>
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
        <button
          type="button"
          onClick={() => canSubmit && navigate("/signup/nickname")}
          disabled={!canSubmit}
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
