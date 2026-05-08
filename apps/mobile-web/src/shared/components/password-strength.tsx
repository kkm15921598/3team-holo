/**
 * 비밀번호 강도 미터 + 라이브 체크리스트.
 *
 * 사용 방법:
 *   <PasswordStrength password={password} />
 *
 * - 4개 조건 검사: 8자 이상, 영문, 숫자, 특수문자
 * - 강도 바: 4구간 게이지 + 약함/보통/강함/매우 강함 라벨
 * - 입력값이 비어있으면 아무것도 렌더링하지 않음 (placeholder 영역 깔끔하게)
 */

type Level = "weak" | "fair" | "good" | "strong";

const LEVEL_LABEL: Record<Level, string> = {
  weak: "약함",
  fair: "보통",
  good: "강함",
  strong: "매우 강함",
};

const LEVEL_BAR: Record<Level, string> = {
  weak: "bg-holo-error",
  fair: "bg-amber-500",
  good: "bg-holo-purple-mid",
  strong: "bg-emerald-500",
};

const LEVEL_TEXT: Record<Level, string> = {
  weak: "text-holo-error",
  fair: "text-amber-500",
  good: "text-holo-purple-mid",
  strong: "text-emerald-500",
};

export function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) return null;

  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    digit: /\d/.test(password),
    // 특수문자 — 자주 쓰이는 문자만 인정 (나머지는 가입 정규식과 충돌 가능)
    special: /[!@#$%^&*()_+\-=<>?{}[\]\\/.,]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const level: Level =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* 강도 바 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors ${
                i < score ? LEVEL_BAR[level] : "bg-holo-line-2"
              }`}
            />
          ))}
        </div>
        <span className={`text-[12px] font-semibold ${LEVEL_TEXT[level]}`}>
          {LEVEL_LABEL[level]}
        </span>
      </div>
      {/* 체크리스트 */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        <Check ok={checks.length}>8자 이상</Check>
        <Check ok={checks.letter}>영문 포함</Check>
        <Check ok={checks.digit}>숫자 포함</Check>
        <Check ok={checks.special} optional>특수문자 (권장)</Check>
      </ul>
    </div>
  );
}

function Check({
  ok,
  optional,
  children,
}: {
  ok: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-center gap-1 ${
        ok
          ? "text-holo-purple-mid"
          : optional
            ? "text-holo-ink-4"
            : "text-holo-ink-3"
      }`}
    >
      {ok ? <CheckIcon /> : <DotIcon />}
      <span>{children}</span>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m4 12 6 6 10-14" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
