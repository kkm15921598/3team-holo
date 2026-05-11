/**
 * 비밀번호 input 아래에 띄우는 Caps Lock 안내 배지.
 *
 * 사용 방법:
 *   <CapsLockBadge visible={capsOn} />
 *
 * 핵심: visible 여부와 상관없이 wrapper가 항상 22px 높이를 차지해서,
 * 캡스락이 켜졌다 꺼질 때 아래 요소들(로그인 버튼 등)이 흔들리지 않습니다.
 */
export function CapsLockBadge({ visible }: { visible: boolean }) {
  return (
    <div className="h-[22px]">
      {visible && (
        <div className="flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] font-medium text-amber-700">
          <CapsIcon />
          Caps Lock이 켜져 있어요
        </div>
      )}
    </div>
  );
}

function CapsIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 4 8 8h-4v6h-8v-6H4l8-8z" />
      <path d="M8 21h8" />
    </svg>
  );
}
