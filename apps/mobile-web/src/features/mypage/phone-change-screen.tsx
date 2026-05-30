import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setPhoneVerified, renameRegionBackup } from "@/shared/stores/verification-store";
import { ConfirmModal } from "@/shared/components/confirm-modal";
import { getCurrentAccount, renameAccount } from "@/shared/stores/account-choices-store";
import { maskPhone } from "@/shared/lib/phone";
import { supabase } from "@/shared/lib/supabaseClient";

const CARRIERS = ["SKT", "KT", "LG U+", "SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"];

/** 가짜 SMS 6자리 인증번호 (SMS 미연동 — 다른 인증 화면과 동일 패턴). */
function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function PhoneChangeScreen() {
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<string | null>("SKT");
  const [phone, setPhone] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [showSmsToast, setShowSmsToast] = useState(false);
  const [verified, setVerified] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 가입/로그인 시 저장된 실제 현재 번호 (raw 숫자). 마스킹해서 표시.
  const currentPhone = getCurrentAccount();
  const currentPhoneMasked = maskPhone(currentPhone);

  const phoneValid = phone.length >= 10;
  const codeValid = code.length === 6;

  const handleSendCode = () => {
    if (!phoneValid) return;
    // 가짜 SMS 발송 — 6자리 코드 생성 후 토스트로 노출.
    const otp = generateOtp();
    setGeneratedCode(otp);
    setShowSmsToast(true);
    setTimeout(() => setShowSmsToast(false), 10000);
    setCodeSent(true);
    setCode("");
    setVerified(false);
    setError("");
  };
  const handleVerify = () => {
    if (!codeValid) return;
    // 발송된 코드와 일치할 때만 인증 — 이전엔 길이만 보고 아무 6자리나 통과했다.
    if (code !== generatedCode) {
      setError("인증번호가 올바르지 않습니다.");
      return;
    }
    setError("");
    setVerified(true);
  };
  const handleSubmit = async () => {
    if (!verified || submitting) return;
    setSubmitting(true);
    setError("");

    const newPhone = phone.replace(/\D/g, "");

    // 변경 전 번호가 있으면 Supabase users.phone 을 실제로 갱신한다.
    // (이전엔 메시지만 띄우고 DB·로컬 어디에도 저장하지 않아 변경이 반영되지 않았음)
    if (currentPhone) {
      const { error: dbError } = await supabase
        .from("users")
        .update({ phone: newPhone })
        .eq("phone", currentPhone);

      if (dbError) {
        setSubmitting(false);
        // 이미 가입된 번호(unique 위반)
        if (dbError.code === "23505") {
          setError("이미 가입된 번호예요. 다른 번호로 시도해주세요.");
        } else {
          setError("번호 변경 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      // 로컬 계정 포인터 + 선택(뱃지/칭호) 키도 새 번호로 이전.
      renameAccount(currentPhone, newPhone);
      // 동네 라벨 백업도 새 번호로 이전 — 안 하면 번호 변경 후 동네가 안 뜰 수 있음.
      renameRegionBackup(currentPhone, newPhone);
    }

    setPhoneVerified(true);
    setSubmitting(false);
    setDone(true);
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
            {currentPhoneMasked}
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
          {error && (
            <p className="mb-2 pl-2 text-[13px] text-holo-error">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!verified || submitting}
            className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
              verified && !submitting ? "bg-holo-ink" : "bg-holo-ink-4"
            }`}
          >
            {submitting ? "변경 중…" : "번호 변경하기"}
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

      {showSmsToast && (
        <div
          role="alert"
          onClick={() => setShowSmsToast(false)}
          className="fixed left-1/2 top-4 z-[1100] w-[92%] max-w-[340px] -translate-x-1/2 cursor-pointer rounded-2xl border-2 border-dashed border-yellow-400 bg-yellow-50 px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-start gap-3">
            <span className="text-[20px]">🛠️</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold text-yellow-700">개발 테스트 모드</span>
                <span className="shrink-0 text-[11px] text-yellow-600">SMS 미연동</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-yellow-800">
                테스트 인증번호:{" "}
                <span className="font-bold text-yellow-900">{generatedCode}</span>
              </p>
            </div>
          </div>
        </div>
      )}
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
