import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";

const CARRIERS = ["SKT", "KT", "LG U+", "SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"];

export function VerificationScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [idNum, setIdNum] = useState("");
  const [carrier, setCarrier] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const baseFilled = name && idNum && carrier && phone.length >= 10;
  const canSubmit = codeSent ? code.length >= 6 : baseFilled;

  const handleMain = () => {
    if (!codeSent) {
      setCodeSent(true);
      return;
    }
    navigate("/signup/nickname");
  };

  return (
    <SignupLayout step={2}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        안전한 서비스 이용을 위해
        <br />
        본인인증을 진행해 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">회원여부 확인 및 가입을 진행합니다.</p>

      <div className="mt-7 flex flex-col gap-3">
        <Input
          placeholder="이름 입력"
          value={name}
          onChange={setName}
        />
        <Input
          placeholder="001100 - 4******"
          value={formatId(idNum)}
          onChange={(v) => setIdNum(v.replace(/\D/g, "").slice(0, 7))}
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className={`flex h-[62px] items-center justify-between rounded-holo-input border px-5 text-left text-[15px] ${
            carrier ? "border-2 border-holo-purple-mid text-holo-purple-mid" : "border-holo-ink-4 text-holo-ink-4"
          }`}
        >
          <span>{carrier ?? "통신사 선택"}</span>
          <ChevronDownIcon />
        </button>
        <Input
          placeholder="휴대폰 번호 입력"
          value={formatPhone(phone)}
          onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
        />
        {codeSent && (
          <div className="flex flex-col gap-1">
            <div className="relative">
              <Input
                placeholder="인증번호 입력"
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] text-holo-error">
                02:17
              </span>
            </div>
            <button type="button" className="self-end pr-2 pt-1 text-[12px] text-holo-ink-3 underline">
              문자가 오지 않는다면? 재전송
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={handleMain}
          disabled={!canSubmit}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canSubmit ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          {codeSent ? "인증 확인" : "인증하기"}
        </button>
      </div>

      {showSheet && (
        <CarrierSheet
          selected={carrier}
          onSelect={(v) => {
            setCarrier(v);
            setShowSheet(false);
          }}
          onClose={() => setShowSheet(false)}
        />
      )}
    </SignupLayout>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "email";
}) {
  return (
    <input
      type="text"
      inputMode={inputMode ?? "text"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[62px] rounded-holo-input border border-holo-ink-4 px-5 text-[15px] outline-none placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
    />
  );
}

function CarrierSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: string | null;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-20 bg-black/40"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-[15px] bg-white px-5 pb-8 pt-3 md:max-w-[360px]"
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
                onClick={() => onSelect(c)}
                className={`flex h-[55px] w-full items-center justify-between rounded-holo-input border px-5 text-[15px] ${
                  selected === c
                    ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                    : "border-holo-line text-holo-ink"
                }`}
              >
                <span>{c}</span>
                {selected === c && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 6 6 10-14" />
    </svg>
  );
}

function formatId(v: string) {
  if (!v) return "";
  if (v.length <= 6) return v;
  const front = v.slice(0, 6);
  const back = v.slice(6, 7);
  return `${front} - ${back}***`;
}

function formatPhone(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}
