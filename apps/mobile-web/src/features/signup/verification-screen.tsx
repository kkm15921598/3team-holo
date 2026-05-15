import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "@/shared/hooks/use-countdown";
import { useSignup, genderFromIdNum } from "@/shared/contexts/signup-context";
import { setGender as setGlobalGender } from "@/shared/stores/verification-store";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { SignupLayout } from "./signup-layout";

const CARRIER_GROUPS: { label: string; items: string[] }[] = [
  { label: "통신사", items: ["SKT", "KT", "LG U+"] },
  { label: "알뜰폰", items: ["SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"] },
];

const MOCK_VERIFY_CODE = "123456";
const MOCK_REGISTERED_PHONES = ["01012345678"];

export function VerificationScreen() {
  const navigate = useNavigate();
  const { data, update } = useSignup();

  const { name, idNum, carrier, phone } = data;

  const [showSheet, setShowSheet] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [showAlreadyJoined, setShowAlreadyJoined] = useState(false);
  const [showIdNum, setShowIdNum] = useState(false);

  // 내국인 / 외국인 구분 — 이름 / ID 번호 입력 방식이 달라진다.
  const [nationality, setNationality] = useState<"kor" | "foreign">("kor");

  const { formatted: codeTimer, expired: codeExpired, restart: restartTimer } =
    useCountdown(180, codeSent);

  // 내국인: 한글 완성형(가-힣) 2~10자
  // 외국인: 영문 알파벳 2~30자, 단어 사이 1칸 공백 허용
  const isNameValid =
    nationality === "kor"
      ? /^[가-힣]{2,10}$/.test(name)
      : /^[a-zA-Z]+(?:\s[a-zA-Z]+)*$/.test(name) &&
        name.length >= 2 &&
        name.length <= 30;

  // ── 주민등록번호 / 외국인등록번호 형식 검증 ───────────────────────
  //  - 13자리
  //  - 앞 6자리가 유효한 YYMMDD (윤년·월별 일수까지 확인)
  //  - 7번째 자리(성별·세기 코드)
  //      내국인: 1·2(1900s), 3·4(2000s)
  //      외국인: 5·6(1900s), 7·8(2000s)
  const idSeventh = idNum.length >= 7 ? idNum.charAt(6) : "";
  const isKoreanIdSeventh = ["1", "2", "3", "4"].includes(idSeventh);
  const isForeignIdSeventh = ["5", "6", "7", "8"].includes(idSeventh);
  const isIdSeventhValid =
    nationality === "kor" ? isKoreanIdSeventh : isForeignIdSeventh;
  const isIdDateValid = (() => {
    if (idNum.length < 6) return false;
    const yy = Number(idNum.slice(0, 2));
    const mm = Number(idNum.slice(2, 4));
    const dd = Number(idNum.slice(4, 6));
    if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return false;
    if (mm < 1 || mm > 12) return false;
    // 7번째 자리로 세기 판정 → 윤년 정확히 계산
    let century = 1900;
    if (["3", "4", "7", "8"].includes(idSeventh)) century = 2000;
    const year = century + yy;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return dd >= 1 && dd <= daysInMonth[mm - 1];
  })();
  const isIdValid = idNum.length === 13 && isIdSeventhValid && isIdDateValid;
  // 인라인 에러 메시지: 13자리 채운 뒤에만 표시
  const idMismatchKind: "none" | "seventh" | "date" =
    idNum.length === 13
      ? !isIdSeventhValid
        ? "seventh"
        : !isIdDateValid
          ? "date"
          : "none"
      : "none";

  // ── 휴대폰 번호 형식 검증 ─────────────────────────────────────
  // 010-XXXX-XXXX (11자리) 또는 01X-XXX(X)-XXXX (10~11자리, X=1·6·7·8·9)
  const PHONE_PATTERN = /^01(?:0\d{8}|[16789]\d{7,8})$/;
  const isPhoneValid = PHONE_PATTERN.test(phone);
  const showPhoneError =
    phone.length >= 3 &&
    !/^01[016789]/.test(phone);

  // 국적 토글 변경 — 검증 패턴이 달라지므로 이름/주민번호 입력값 초기화
  const handleNationalityChange = (next: "kor" | "foreign") => {
    if (next === nationality) return;
    setNationality(next);
    update("name", "");
    update("idNum", "");
    update("gender", null);
  };
  
  const baseFilled = isNameValid && isIdValid && carrier && isPhoneValid;
  const canSubmit = codeSent ? code.length === 6 : baseFilled;

  const handleMain = () => {
    setVerifyError("");

    if (!codeSent) {
      if (!baseFilled) return;
      setCodeSent(true);
      return;
    }

    if (code.length < 6) return;
    if (codeExpired) {
      setVerifyError("인증 시간이 만료되었습니다. 재전송해주세요.");
      return;
    }
    if (code !== MOCK_VERIFY_CODE) {
      setVerifyError("인증번호가 일치하지 않습니다.");
      return;
    }

    if (MOCK_REGISTERED_PHONES.includes(phone)) {
      setShowAlreadyJoined(true);
      return;
    }

    update("phoneVerified", true);
    navigate("/signup/account");
  };

  const handleResendCode = () => {
    setCode("");
    setVerifyError("");
    restartTimer();
  };

  return (
    <SignupLayout step={2}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        안전한 서비스 이용을 위해
        <br />
        본인인증을 진행해 주세요!
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">회원여부 확인 및 가입을 진행합니다.</p>
      <p className="mt-1 text-[12px] text-holo-purple-mid">
        ※ 휴대폰 번호 1개당 하나의 계정만 만들 수 있어요.
      </p>

      {/* 국적 토글 — 내국인 / 외국인 */}
      <div className="mt-6 flex h-[44px] rounded-holo-pill border border-holo-line p-[3px]">
        {(
          [
            { id: "kor", label: "내국인" },
            { id: "foreign", label: "외국인" },
          ] as const
        ).map((opt) => {
          const on = nationality === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleNationalityChange(opt.id)}
              className={`flex-1 rounded-holo-pill text-[14px] font-semibold transition ${
                on
                  ? "bg-holo-purple-mid text-white shadow-sm"
                  : "text-holo-ink-3"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {nationality === "kor" ? (
          <Input
            placeholder="이름 입력 (한글 2~10자)"
            value={name}
            onChange={(v) => {
              // 한글 완성형 + 자모(IME 조합 중 임시로 노출되는 ㄱㄴㄷ/ㅏㅑㅓ) 허용.
              // 자모만으로는 isNameValid가 통과되지 않으므로 다음 버튼은 비활성 상태 유지.
              const filtered = v.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/g, "").slice(0, 10);
              update("name", filtered);
            }}
            valid={isNameValid}
            maxLength={10}
          />
        ) : (
          <Input
            placeholder="이름 입력 (영문 2~30자)"
            value={name}
            onChange={(v) => {
              // 영문/공백 외 문자는 즉시 제거 + 연속 공백 압축 + 30자 제한
              const filtered = v
                .replace(/[^a-zA-Z\s]/g, "")
                .replace(/\s{2,}/g, " ")
                .slice(0, 30);
              update("name", filtered);
            }}
            valid={isNameValid}
            maxLength={30}
          />
        )}

        <div className="flex flex-col gap-1">
          <div className="relative">
            <Input
              placeholder={
                nationality === "kor"
                  ? "주민등록번호 입력"
                  : "외국인등록번호 입력"
              }
              value={showIdNum ? formatIdRaw(idNum) : formatId(idNum)}
              onChange={(v) => {
                const next = parseIdInput(v, idNum, !showIdNum);
                update("idNum", next);
                // 뒷자리 첫 숫자가 입력되면 성별 자동 인식
                const g = genderFromIdNum(next);
                update("gender", g);
                // 전역 인증 store 에도 반영하여 프로필 편집의 캐릭터 필터에 사용
                if (g) setGlobalGender(g);
              }}
              inputMode="numeric"
              valid={isIdValid}
              error={idMismatchKind !== "none"}
              paddingRight
            />
            <PasswordToggle
              visible={showIdNum}
              onClick={() => setShowIdNum((s) => !s)}
            />
          </div>
          {idMismatchKind === "seventh" && (
            <p className="pl-2 text-[12px] text-holo-error">
              {nationality === "kor"
                ? "주민등록번호 형식이 올바르지 않습니다. (뒷자리 첫 숫자 1~4)"
                : "외국인등록번호 형식이 올바르지 않습니다. (뒷자리 첫 숫자 5~8)"}
            </p>
          )}
          {idMismatchKind === "date" && (
            <p className="pl-2 text-[12px] text-holo-error">
              생년월일이 올바르지 않습니다. (YYMMDD)
            </p>
          )}
        </div>

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

        <div className="flex flex-col gap-1">
          <Input
            placeholder="휴대폰 번호 입력"
            value={formatPhone(phone)}
            onChange={(v) => update("phone", v.replace(/\D/g, "").slice(0, 11))}
            inputMode="numeric"
            autoComplete="tel"
            valid={isPhoneValid}
            error={showPhoneError}
          />
          {showPhoneError && (
            <p className="pl-2 text-[12px] text-holo-error">
              010·011·016·017·018·019 로 시작하는 번호여야 합니다.
            </p>
          )}
        </div>

        {codeSent && (
          <div className="flex flex-col gap-1">
            <div className="relative">
              <Input
                placeholder="인증번호 입력"
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, "").slice(0, 6));
                  setVerifyError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                valid={code.length === 6}
                error={!!verifyError}
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] text-holo-error">
                {codeTimer}
              </span>
            </div>
            {verifyError && (
              <p className="pl-2 text-[13px] text-holo-error">{verifyError}</p>
            )}
            {!verifyError && codeExpired && (
              <p className="pl-2 text-[13px] text-holo-error">
                인증 시간이 만료되었습니다. 재전송해주세요.
              </p>
            )}
            <button
              type="button"
              onClick={handleResendCode}
              className="self-end pr-2 pt-1 text-[12px] text-holo-ink-3 underline"
            >
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
            update("carrier", v);
            setShowSheet(false);
          }}
          onClose={() => setShowSheet(false)}
        />
      )}

      {showAlreadyJoined && (
        <AlreadyJoinedModal
          onLogin={() => navigate("/login", { replace: true })}
          onFindPassword={() => navigate("/auth/find-password", { replace: true })}
          onClose={() => setShowAlreadyJoined(false)}
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
  onBlur,
  error,
  valid,
  maxLength,
  autoComplete,
  paddingRight,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric" | "email";
  onBlur?: () => void;
  error?: boolean;
  valid?: boolean;
  maxLength?: number;
  autoComplete?: string;
  paddingRight?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const enforceMax = (target: HTMLInputElement) => {
    let v = target.value;
    if (maxLength != null && v.length > maxLength) {
      v = v.slice(0, maxLength);
      target.value = v;
    }
    return v;
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={inputMode ?? "text"}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(enforceMax(e.target))}
      onCompositionEnd={(e) => {
        const v = enforceMax(e.currentTarget);
        if (v !== value) onChange(v);
      }}
      onBlur={onBlur}
      className={`h-[62px] w-full rounded-holo-input ${paddingRight ? "pr-12 pl-5" : "px-5"} text-[15px] outline-none ${
        error
          ? "border-2 border-holo-error"
          : valid
            ? "border-2 border-holo-purple-mid text-holo-purple-mid"
            : "border border-holo-ink-4 placeholder:text-holo-ink-4 focus:border-2 focus:border-holo-purple-mid focus:text-holo-purple-mid"
      }`}
    />
  );
}

function CarrierSheet({ selected, onSelect, onClose }: any) {
  return (
    <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose}>
      <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 rounded-t-[15px] bg-white px-5 pb-8 pt-3 md:max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-[6px] w-[70px] rounded-full bg-holo-line" />
        <p className="mb-4 text-center text-[16px] font-semibold text-holo-ink">통신사를 선택해 주세요.</p>
        <div className="flex flex-col gap-5">
          {CARRIER_GROUPS.map((group, i) => (
            <section key={group.label} className="flex flex-col gap-2">
              <header className="flex items-center gap-3 px-1">
                <span className="text-[12px] font-semibold tracking-wide text-holo-ink-3">{group.label}</span>
                <span className="h-px flex-1 bg-holo-line-2" />
              </header>
              <ul className="flex flex-col gap-2">
                {group.items.map((c) => (
                  <li key={c}>
                    <button type="button" onClick={() => onSelect(c)} className={`flex h-[55px] w-full items-center justify-between rounded-holo-input border px-5 text-[15px] ${selected === c ? "border-2 border-holo-purple-mid text-holo-purple-mid" : "border-holo-line text-holo-ink"}`}>
                      <span>{c}</span>
                      {selected === c && <CheckIcon />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlreadyJoinedModal({ onLogin, onFindPassword, onClose }: any) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <div className="w-full max-w-[320px] rounded-[18px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-[16px] font-semibold text-holo-ink">이미 가입된 번호예요</p>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-holo-ink-3">휴대폰 번호 1개당 아이디 1개만 만들 수 있어요.<br />기존 계정으로 로그인하거나 비밀번호를 찾아보세요.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onLogin} className="h-[48px] w-full rounded-holo-pill bg-holo-gradient text-[14px] font-semibold text-white">로그인하기</button>
          <button type="button" onClick={onFindPassword} className="h-[48px] w-full rounded-holo-pill border border-holo-purple-mid text-[14px] font-semibold text-holo-purple-mid">비밀번호 찾기</button>
          <button type="button" onClick={onClose} className="h-[40px] w-full text-[13px] text-holo-ink-3">다른 번호로 다시 인증</button>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>; }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m4 12 6 6 10-14" /></svg>; }

// 마스킹 표시: "123456 - 1***" — 7번째 자리만 보이고 나머지는 실제 입력된 만큼만 *
function formatId(v: string) {
  if (!v) return "";
  if (v.length <= 6) return v;
  const seven = v.slice(6, 7);
  const hiddenCount = Math.max(0, v.length - 7);
  return `${v.slice(0, 6)} - ${seven}${"*".repeat(hiddenCount)}`;
}

// 미마스킹 표시: 전체 13자리 모두 노출
function formatIdRaw(v: string) {
  if (!v) return "";
  if (v.length <= 6) return v;
  return `${v.slice(0, 6)} - ${v.slice(6)}`;
}

// 입력 파서 — 마스킹 모드에서도 추가/삭제가 정상 동작하도록 prev와 diff 비교
function parseIdInput(displayValue: string, prevIdNum: string, masked: boolean) {
  if (!masked) {
    // 노출 모드: 그냥 숫자만 추출
    return displayValue.replace(/\D/g, "").slice(0, 13);
  }

  // 마스킹 모드
  const prevDisplay = formatId(prevIdNum);
  const newDigits = displayValue.replace(/\D/g, "");
  const prevDigits = prevDisplay.replace(/\D/g, "");
  const lenDiff = displayValue.length - prevDisplay.length;

  // 사용자가 문자(숫자)를 추가했음 → 가시 영역 뒤에 새 숫자가 추가된 것으로 간주하여 idNum에 append
  if (lenDiff > 0) {
    const addedDigits = newDigits.length - prevDigits.length;
    if (addedDigits > 0) {
      const additions = newDigits.slice(prevDigits.length);
      return (prevIdNum + additions).slice(0, 13);
    }
    return prevIdNum;
  }

  // 사용자가 문자(숫자 또는 *)를 삭제했음 → idNum 끝에서 그만큼 제거
  if (lenDiff < 0) {
    const removed = -lenDiff;
    return prevIdNum.slice(0, Math.max(0, prevIdNum.length - removed));
  }

  // 길이 동일 — 가시 영역의 숫자가 교체된 경우. 새 숫자 + 기존 숨김 결합
  return (newDigits + prevIdNum.slice(newDigits.length)).slice(0, 13);
}

function formatPhone(v: string) {
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
