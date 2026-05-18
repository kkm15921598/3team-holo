import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/shared/components/confirm-modal";

const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,16}$/;

export function PasswordChangeScreen() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const nextValid = PASSWORD_PATTERN.test(next);
  const nextInvalid = next.length > 0 && !nextValid;
  const confirmMatch = next.length > 0 && confirm.length > 0 && next === confirm;
  const confirmMismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;

  const canSubmit =
    current.length > 0 && nextValid && confirmMatch && !sameAsCurrent;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setDone(true);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          비밀번호 변경
        </span>
      </header>

      <section className="flex flex-1 flex-col px-4 pt-2">
        <p className="text-[13px] text-holo-ink-3">
          안전한 사용을 위해 주기적으로 비밀번호를 바꿔주세요.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <FieldLabel text="현재 비밀번호" />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="현재 비밀번호 입력"
            value={current}
            onChange={(e) => setCurrent(e.target.value.slice(0, 16))}
            maxLength={16}
            className="h-[58px] rounded-holo-input border border-holo-ink-4 px-5 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
          />

          <FieldLabel text="새 비밀번호" hint="영문 + 숫자 8~16자" />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="새 비밀번호 입력"
            value={next}
            onChange={(e) => setNext(e.target.value.slice(0, 16))}
            maxLength={16}
            className={`h-[58px] rounded-holo-input px-5 text-[15px] outline-none ${
              nextInvalid || sameAsCurrent
                ? "border-2 border-holo-error"
                : nextValid
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {nextInvalid && (
            <p className="pl-2 text-[13px] text-holo-error">
              영문과 숫자를 포함해 8~16자로 입력해주세요.
            </p>
          )}
          {sameAsCurrent && (
            <p className="pl-2 text-[13px] text-holo-error">
              현재 비밀번호와 다른 값을 입력해주세요.
            </p>
          )}

          <FieldLabel text="새 비밀번호 확인" />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="한 번 더 입력"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.slice(0, 16))}
            maxLength={16}
            className={`h-[58px] rounded-holo-input px-5 text-[15px] outline-none ${
              confirmMismatch
                ? "border-2 border-holo-error"
                : confirmMatch
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
            }`}
          />
          {confirmMismatch && (
            <p className="pl-2 text-[13px] text-holo-error">
              비밀번호가 일치하지 않아요.
            </p>
          )}
        </div>

        <div className="mt-auto pb-4 pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
              canSubmit ? "bg-holo-ink" : "bg-holo-ink-4"
            }`}
          >
            변경 완료
          </button>
        </div>
      </section>

      <ConfirmModal
        open={done}
        message="비밀번호가 변경되었어요!"
        description="다음 로그인부터 새 비밀번호로 접속해주세요."
        singleAction
        onConfirm={() => {
          setDone(false);
          navigate(-1);
        }}
      />
    </main>
  );
}

function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between pl-1">
      <span className="text-[13px] font-semibold text-holo-ink">{text}</span>
      {hint && <span className="text-[11px] text-holo-ink-3">{hint}</span>}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
