import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";

const KOREAN_ONLY = /^[가-힣]+$/;

export function NicknameScreen() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const isInvalid = value.length > 0 && (!KOREAN_ONLY.test(value) || value.length > 10);
  const isValid = value.length > 0 && !isInvalid;

  return (
    <SignupLayout step={4}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        HOLO에서 사용할
        <br />
        당신의 이름을 정해주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">한글 최대 10자 / 공백, 특수문자 불가</p>

      <div className="mt-7 flex flex-col gap-1">
        <div className="relative">
          <input
            type="text"
            placeholder="닉네임을 입력해 주세요"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`h-[62px] w-full rounded-holo-input border px-5 pr-12 text-[15px] outline-none placeholder:text-holo-ink-4 ${
              isInvalid
                ? "border-2 border-holo-error text-holo-error"
                : isValid
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {isValid && (
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-holo-purple-mid">
              <CheckIcon />
            </span>
          )}
          {isInvalid && (
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-holo-error">
              <ErrorIcon />
            </span>
          )}
        </div>
        {isInvalid && (
          <p className="pl-2 text-[13px] text-holo-error">닉네임을 다시 확인해 주세요.</p>
        )}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <p className="text-[12px] text-holo-ink-3">나중에 다시 수정할 수 있어요!</p>
        <button
          type="button"
          onClick={() => isValid && navigate("/signup/interest")}
          disabled={!isValid}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            isValid ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>
    </SignupLayout>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 6 6 10-14" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
