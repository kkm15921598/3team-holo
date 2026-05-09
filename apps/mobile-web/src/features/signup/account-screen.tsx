import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PasswordToggle } from "@/shared/components/password-toggle";
import {
  PasswordStrength,
  passwordIncludesForbidden,
} from "@/shared/components/password-strength";
import { CapsLockBadge } from "@/shared/components/caps-lock-badge";
import { useCapsLock } from "@/shared/hooks/use-caps-lock";
import { useSignup } from "@/shared/contexts/signup-context";
import { SignupLayout } from "./signup-layout";

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,15}$/;
const isValidId = (v: string) => ID_PATTERN.test(v);

const MOCK_TAKEN_IDS = ["admin", "test", "user", "holo", "test1234"];

const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,16}$/;

export function AccountScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();

  const userId = data.userId;
  const password = data.password;

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [idTaken, setIdTaken] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const pwCaps = useCapsLock();
  const pwConfirmCaps = useCapsLock();

  const idFormatValid = isValidId(userId);
  const idFormatInvalid = userId.length > 0 && !idFormatValid;

  const passwordValid = PASSWORD_PATTERN.test(password);
  const passwordInvalid = password.length > 0 && !passwordValid;
  const passwordIncludesId = passwordIncludesForbidden(password, userId);
  const passwordMatch =
    password.length > 0 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm;
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm;

  const canSubmit =
    idChecked && passwordValid && passwordMatch && !passwordIncludesId;

  const handleCheckId = () => {
    if (!idFormatValid) return;
    if (MOCK_TAKEN_IDS.includes(userId.toLowerCase())) {
      setIdChecked(false);
      setIdTaken(true);
    } else {
      setIdChecked(true);
      setIdTaken(false);
    }
  };

  return (
    <SignupLayout step={3}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        로그인에 사용할
        <br />
        아이디와 비밀번호를 만들어 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">
        아이디는 가입 후에 변경할 수 없어요.
      </p>

      <div className="mt-7 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
              placeholder="아이디 입력 (영문+숫자 4~16자)"
              value={userId}
              onChange={(e) => {
                update("userId", e.target.value.slice(0, 16));
                if (idChecked || idTaken) {
                  setIdChecked(false);
                  setIdTaken(false);
                }
              }}
              disabled={idChecked}
              maxLength={16}
              className={`h-[62px] flex-1 rounded-holo-input px-5 text-[15px] outline-none ${
                idFormatInvalid || idTaken
                  ? "border-2 border-holo-error"
                  : idFormatValid
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              } ${idChecked ? "bg-holo-line-2/50" : ""}`}
            />
            <button
              type="button"
              onClick={handleCheckId}
              disabled={!idFormatValid || idChecked}
              className={`h-[62px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold transition ${
                idChecked
                  ? "bg-holo-purple-mid text-white"
                  : idFormatValid
                    ? "bg-holo-ink text-white active:scale-[0.98]"
                    : "bg-holo-ink-4 text-white"
              }`}
            >
              {idChecked ? "확인 완료" : "중복확인"}
            </button>
          </div>
          {idFormatInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              영문으로 시작하는 4~16자(영문/숫자/_)로 입력해 주세요.
            </p>
          )}
          {idTaken && (
            <p className="pl-2 text-[13px] text-holo-error">
              이미 사용 중인 아이디예요.
            </p>
          )}
          {idChecked && (
            <p className="pl-2 text-[13px] text-holo-purple-mid">
              사용 가능한 아이디예요.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="비밀번호 (영문 + 숫자 8~16자)"
              value={password}
              onChange={(e) => update("password", e.target.value.slice(0, 16))}
              onKeyDown={pwCaps.capsHandlers.onKeyDown}
              onKeyUp={pwCaps.capsHandlers.onKeyUp}
              onBlur={pwCaps.capsHandlers.onBlur}
              maxLength={16}
              className={`h-[62px] w-full rounded-holo-input px-5 pr-12 text-[15px] outline-none ${
                passwordInvalid || passwordIncludesId
                  ? "border-2 border-holo-error"
                  : passwordValid
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              }`}
            />
            <PasswordToggle visible={showPw} onClick={() => setShowPw((s) => !s)} />
          </div>
          <CapsLockBadge visible={pwCaps.capsOn} />
          {passwordInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              영문과 숫자를 모두 포함해 8~16자로 입력해 주세요.
            </p>
          )}
          <PasswordStrength
            password={password}
            forbiddenSubstring={userId}
            forbiddenLabel="아이디"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="relative">
            <input
              type={showPwConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              onKeyDown={pwConfirmCaps.capsHandlers.onKeyDown}
              onKeyUp={pwConfirmCaps.capsHandlers.onKeyUp}
              onBlur={pwConfirmCaps.capsHandlers.onBlur}
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
