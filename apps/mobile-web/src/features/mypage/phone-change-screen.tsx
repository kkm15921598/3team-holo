import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setPhoneVerified } from "@/shared/stores/verification-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";

const CARRIERS = ["SKT", "KT", "LG U+", "SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"];
const CURRENT_PHONE = "010-****-1234";

export function PhoneChangeScreen() {
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<string | null>("SKT");
  const [phone, setPhone] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);

  const phoneValid = phone.length >= 10;
  const codeValid = code.length === 6;

  const handleSendCode = () => {
    if (!phoneValid) return;
    setCodeSent(true);
    setCode("");
    setVerified(false);
  };
  const handleVerify = () => {
    if (codeValid) setVerified(true);
  };
  const handleSubmit = () => {
    if (verified) {
      setPhoneVerified(true);
      setDone(true);
    }
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          휴대폰 번호 변경
        </span>
      </header>

      <section className="px-4 pt-2">
        <div className="rounded-holo-input bg-holo-lilac-card-2 px-4 py-3">
          <p className="text-[12px] text-holo-ink-3">현재 번호</p>
          <p className="mt-0.5 text-[15px] font-semibold text-holo-ink">
            {CURRENT_PHONE}
          </p>
        </div>
      </section>

      <section className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-[13px] text-holo-ink-3">
          새로 사용할 통신사와 휴대폰 번호를 입력해주세요.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className={`flex h-[58px] items-center justify-between rounded-holo-input border px-5 text-left text-[15px] ${
              carrier
                ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                : "border-holo-ink-4 text-holo-ink-4"
            }`}
          >
            <span>{carrier ?? "통신사 선택"}</span>
            <ChevronDownIcon />
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="휴대폰 번호 입력 (- 없이)"
              value={formatPhone(phone)}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 11));
                if (codeSent) {
                  setCodeSent(false);
                  setCode("");
                  setVerified(false);
                }
              }}
              disabled={verified}
              className={`h-[58px] flex-1 rounded-holo-input px-5 text-[15px] outline-none ${
                phoneValid
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
              } ${verified ? "bg-holo-line-2/50" : ""}`}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!phoneValid || verified}
              className={`h-[58px] shrink-0 rounded-holo-input px-4 text-[14px] font-semibold ${
                phoneValid && !verified
                  ? "bg-holo-ink text-white active:scale-[0.98]"
                  : "bg-holo-ink-4 text-white"
              }`}
            >
              {codeSent && !verified ? "재전송" : "인증요청"}
            </button>
          </div>

          {codeSent && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="인증번호 6자리 입력"
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
                      02:59
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
                  인증이 완료되었어요.
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
            번호 변경하기
          </button>
        </div>
      </section>

      {showSheet && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-t-[15px] bg-white px-5 pb-8 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-[6px] w-[70px] rounded-full bg-holo-line" />
            <p className="mb-4 text-center text-[16px] font-semibold text-holo-ink">
              통신사를 선택해 주세요.
            </p>
            <ul className="flex flex-col gap-2">
              {CARRIERS.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => {
                      setCarrier(c);
                      setShowSheet(false);
                    }}
                    className={`flex h-[55px] w-full items-center justify-between rounded-holo-input border px-5 text-[15px] ${
                      carrier === c
                        ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                        : "border-holo-line text-holo-ink"
                    }`}
                  >
                    <span>{c}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        open={done}
        message="번호가 변경되었어요!"
        description={`${formatPhone(phone)} 로 등록되었습니다.`}
        singleAction
        onConfirm={() => {
          setDone(false);
          navigate(-1);
        }}
      />
    </main>
  );
}

function formatPhone(v: string) {
  if (!v) return "";
  if (v.length < 4) return v;
  if (v.length < 8) return `${v.slice(0, 3)}-${v.slice(3)}`;
  return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
