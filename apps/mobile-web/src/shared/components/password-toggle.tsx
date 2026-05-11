/**
 * 비밀번호 input 우측에 들어가는 눈 아이콘 토글 버튼.
 *
 * 사용 방법:
 *   <div className="relative">
 *     <input type={visible ? "text" : "password"} className="... pr-12" />
 *     <PasswordToggle visible={visible} onClick={() => setVisible(v => !v)} />
 *   </div>
 *
 * - 기본은 visible=false (눈 감김 = EyeOff 아이콘 = 비밀번호 가려짐)
 * - 클릭하면 visible=true (눈 뜸 = Eye 아이콘 = 비밀번호 노출)
 */
export function PasswordToggle({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? "비밀번호 가리기" : "비밀번호 보이기"}
      aria-pressed={visible}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-holo-ink-4 transition hover:text-holo-ink-3"
    >
      {visible ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
