import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCountdown } from "@/shared/hooks/use-countdown";
import { useSignup, genderFromIdNum } from "@/shared/contexts/signup-context";
import { setGender as setGlobalGender } from "@/shared/stores/verification-store";
import { PasswordToggle } from "@/shared/components/password-toggle";
import { supabase } from "@/shared/lib/supabaseClient";
import { SignupLayout } from "./signup-layout";

const CARRIER_GROUPS: { label: string; items: string[] }[] = [
  { label: "통신사", items: ["SKT", "KT", "LG U+"] },
  { label: "알뜰폰", items: ["SKT 알뜰폰", "KT 알뜰폰", "LG U+ 알뜰폰"] },
];

// 데모용: 실제 SMS 발송 없이 가짜 6자리 인증번호를 생성.
// 실제 SMS API 연동 전까지 사용. 가입 화면에서 발송 시점에 무작위 코드를 만들어
// 화면 상단의 가짜 알림 토스트로 보여주고, 그 값과 사용자가 입력한 값을 비교한다.
function generateMockCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

  // 데모용 가짜 SMS 인증: 발송 시 무작위 코드 생성 → 토스트로 보여줌
  const [generatedCode, setGeneratedCode] = useState("");
  const [showSmsToast, setShowSmsToast] = useState(false);

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

  const handleMain = async () => {
    setVerifyError("");

    if (!codeSent) {
      // 비활성 상태에서 눌렀을 때 빠진 항목을 인라인으로 안내(알림창 대신).
      if (!baseFilled) {
        setVerifyError(
          !isNameValid
            ? "이름을 입력해 주세요."
            : !isIdValid
              ? "주민등록번호를 정확히 입력해 주세요."
              : !carrier
                ? "통신사를 선택해 주세요."
                : "휴대폰 번호를 정확히 입력해 주세요.",
        );
        return;
      }
      // 이미 가입된 번호인지 먼저 확인 — 중복 가입을 가입 초반에 차단.
      // (이전엔 검사가 없어 마지막 review-screen insert 의 23505 alert 까지 가서야 막혔고,
      //  구현돼 있던 AlreadyJoinedModal 은 호출처가 없어 절대 안 뜨는 dead UI 였다.)
      // RLS 적용 후 anon 은 users 직접 조회 불가 → 전용 RPC 로 확인.
      const { data: existing, error } = await supabase.rpc(
        "check_phone_exists",
        { p_phone: phone },
      );
      if (error) {
        setVerifyError("일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (existing) {
        setShowAlreadyJoined(true);
        return;
      }
      // 가짜 SMS 발송: 무작위 6자리 코드 생성 + 토스트 노출
      const newCode = generateMockCode();
      setGeneratedCode(newCode);
      setCodeSent(true);
      setShowSmsToast(true);
      // 10초 뒤 자동으로 토스트 닫기
      setTimeout(() => setShowSmsToast(false), 10000);
      return;
    }

    if (code.length < 6) {
      setVerifyError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    // 코드 발송 후 이름/주민번호/통신사/번호를 바꿔도 통과되던 문제 — 발송 시점이 아닌
    // 제출 시점의 입력 유효성을 다시 확인한다(중복확인 우회·잘못된 번호 가입 방지).
    if (!baseFilled) {
      setVerifyError("입력 정보를 다시 확인해주세요.");
      return;
    }
    if (codeExpired) {
      setVerifyError("인증 시간이 만료되었습니다. 재전송해주세요.");
      return;
    }
    if (code !== generatedCode) {
      setVerifyError("인증번호가 일치하지 않습니다.");
      return;
    }

    update("phoneVerified", true);
    navigate("/signup/account");
  };

  const handleResendCode = () => {
    // 재전송 시에도 새 코드를 생성하여 매번 다른 값이 나오도록 함
    const newCode = generateMockCode();
    setGeneratedCode(newCode);
    setCode("");
    setVerifyError("");
    restartTimer();
    setShowSmsToast(true);
    setTimeout(() => setShowSmsToast(false), 10000);
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

      {/* 국적 토글 — 내국인 / 외국인. shrink-0 으로 좁은 뷰포트에서도 세로 크기 유지. */}
      <div className="mt-6 flex h-[44px] shrink-0 rounded-holo-pill border border-holo-line p-[3px]">
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

      <div className="mt-4 flex shrink-0 flex-col gap-3">
        {nationality === "kor" ? (
          <Input
            placeholder="이름 입력 (한글 2~10자)"
            value={name}
            onChange={(v) => {
              // 한글 완성형(가-힣) + 자모(IME 조합 중 임시로 노출되는 ㄱㄴㄷ/ㅏㅑㅓ) +
              // 천지인 키보드의 "·"(U+00B7), "ㆍ"(U+318D 아래아) 같은 조합 부호 허용.
              // 이걸 막으면 천지인 사용자는 모음을 만들 수 없어 글자 자체가 입력되지 않는다.
              // \p{Script=Hangul} 로 한글 스크립트 전체(자모/완성형/확장)를 허용하고,
              // 추가로 천지인 전용 "·" 를 명시. 자모/부호 단독으로는 isNameValid 가 통과
              // 하지 않으므로 다음 버튼은 비활성 유지.
              const filtered = v
                .replace(/[^\p{Script=Hangul}·]/gu, "")
                .slice(0, 10);
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
                // 뒷자리 첫 숫자(7번째 자리)가 유효 범위일 때만 성별 자동 인식 + 전역 반영.
                // (이전엔 0·9 같은 무효 값에도 genderFromIdNum 이 값을 반환해 전역 store 가 오염됐다.)
                const valid7 =
                  next.length >= 7 &&
                  (nationality === "kor"
                    ? ["1", "2", "3", "4"]
                    : ["5", "6", "7", "8"]
                  ).includes(next.charAt(6));
                const g = valid7 ? genderFromIdNum(next) : null;
                update("gender", g);
                // 전역 verification-store 는 M/F 만 보관(null 미지원)하므로 유효한 값일 때만
                // 갱신한다. 무효(null)로 되돌아가도 전역 성별은 가입 완료/로그인 시 최종 동기화됨.
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
          className={`flex h-[62px] shrink-0 items-center justify-between rounded-holo-input border px-5 text-left text-[15px] ${
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
                placeholder="인증번호 6자리"
                value={code}
                onChange={(v) => {
                  setCode(v.replace(/\D/g, "").slice(0, 6));
                  setVerifyError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                valid={code.length === 6}
                error={!!verifyError}
                otp
              />
              {/* 남은 시간 — OTP 입력은 가운데 정렬이라 우측 타이머와 안 겹친다(pr-16 확보). */}
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-holo-error">
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

      <div className="mt-auto shrink-0 pt-6">
        {/* 코드 발송 전 빠진 항목 안내 — 코드 발송 후엔 입력칸 아래(verifyError)에 표시됨. */}
        {!codeSent && verifyError && (
          <p className="mb-2 pl-2 text-[13px] text-holo-error">{verifyError}</p>
        )}
        <button
          type="button"
          onClick={handleMain}
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
          onSelect={(v: string) => {
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

      {showSmsToast && (
        <SmsToast
          code={generatedCode}
          onClose={() => setShowSmsToast(false)}
        />
      )}
    </SignupLayout>
  );
}

/**
 * 개발 전용 인증번호 안내 배너.
 * 실제 SMS API 연동 전까지 테스트 목적으로만 표시.
 * 클릭하면 닫히고, handleMain 쪽에서 10초 뒤 자동 닫힘 처리도 한다.
 */
function SmsToast({ code, onClose }: { code: string; onClose: () => void }) {
  // HOLO 디자인 톤(보라/라일락, 둥근 카드, 부드러운 그림자)에 맞춘 인증번호 안내 말풍선.
  // 상단 중앙에서 살짝 내려온 카드 + 아래쪽 꼬리로 "메시지 도착" 느낌을 준다.
  return (
    <div
      role="alert"
      onClick={onClose}
      className="fixed left-1/2 top-5 z-[1100] w-[88%] max-w-[330px] -translate-x-1/2 cursor-pointer animate-holo-logo-in"
    >
      <div className="relative rounded-[16px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(116,72,221,0.22)] ring-1 ring-holo-lilac-deep/40">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-holo-lilac-card text-[18px]">
            💬
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-holo-purple-mid">
              HOLO 인증번호가 도착했어요
            </p>
            <p className="mt-0.5 text-[15px] font-bold tracking-[0.18em] text-holo-ink">
              {code}
            </p>
          </div>
        </div>
        {/* 말풍선 꼬리 — 카드 하단 좌측. 카드 배경색과 동일한 흰색 삼각형. */}
        <span
          aria-hidden
          className="absolute h-0 w-0"
          style={{
            bottom: "-7px",
            left: "26px",
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "8px solid #fff",
          }}
        />
      </div>
    </div>
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
  otp,
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
  /** 인증번호 입력 — 가운데 정렬 + 큰 숫자/넓은 자간(토스·카카오 OTP 스타일). */
  otp?: boolean;
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
      className={`h-[62px] w-full shrink-0 rounded-holo-input ${
        otp
          ? "pr-16 pl-16 text-center text-[20px] font-semibold tracking-[0.4em] placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal"
          : paddingRight
            ? "pr-12 pl-5 text-[15px]"
            : "px-5 text-[15px]"
      } outline-none ${
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
          {CARRIER_GROUPS.map((group) => (
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
  // 액션이 3개라 표준 ConfirmModal (2버튼) 로는 못 담아 — 시각 envelope (rounded-[14px], max-w-[300px], 14px 본문, 12px 설명) 은 동일하게 맞춘 채 버튼만 세로 스택으로 둠.
  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 px-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-[14px] bg-white p-5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      >
        <p className="text-[14px] font-semibold leading-snug text-holo-ink">
          이미 가입된 번호예요
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-holo-ink-3">
          휴대폰 번호 1개당 아이디 1개만 만들 수 있어요.
          <br />
          기존 계정으로 로그인하거나 비밀번호를 찾아보세요.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="h-10 w-full rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
          >
            로그인하기
          </button>
          <button
            type="button"
            onClick={onFindPassword}
            className="h-10 w-full rounded-full border border-holo-line text-[13px] text-holo-ink"
          >
            비밀번호 찾기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-holo-ink-3 underline"
          >
            다른 번호로 다시 인증
          </button>
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
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
