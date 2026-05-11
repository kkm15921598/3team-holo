/**
 * 비밀번호 강도 미터 + 라이브 체크리스트.
 *
 * 사용 방법:
 *   <PasswordStrength password={password} />
 *   <PasswordStrength password={password} forbiddenSubstring={userId} forbiddenLabel="아이디" />
 *
 * - 4개 조건 검사: 8자 이상, 영문, 숫자, 특수문자
 * - 강도 바: 4구간 게이지 + 약함/보통/강함/매우 강함 라벨
 * - forbiddenSubstring이 주어지면 비밀번호가 그 substring을 포함하는지 검사하고
 *   포함 시 빨간 경고 노출 (보안 가이드)
 * - 입력값이 비어있으면 아무것도 렌더링하지 않음
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

/**
 * 비밀번호가 금지 substring(예: 아이디)을 포함하는지 검사.
 * forbidden이 너무 짧으면(<3) 우연히 포함될 가능성이 높아서 검사하지 않음.
 */
export function passwordIncludesForbidden(
  password: string,
  forbidden: string,
): boolean {
  if (!password || !forbidden || forbidden.length < 3) return false;
  return password.toLowerCase().includes(forbidden.toLowerCase());
}

export function PasswordStrength({
  password,
  forbiddenSubstring,
  forbiddenLabel = "아이디",
}: {
  password: string;
  forbiddenSubstring?: string;
  forbiddenLabel?: string;
}) {
  if (password.length === 0) return null;

  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=<>?{}[\]\\/.,]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const level: Level =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";

  const includesForbidden = passwordIncludesForbidden(
    password,
    forbiddenSubstring ?? "",
  );

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
      {/* 금지 substring(아이디 등) 포함 경고 */}
      {includesForbidden && (
        <p className="flex items-center gap-1 text-[12px] text-holo-error">
          <WarnIcon />
          보안을 위해 비밀번호에 {forbiddenLabel}를 포함하지 마세요.
        </p>
      )}
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

function WarnIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
