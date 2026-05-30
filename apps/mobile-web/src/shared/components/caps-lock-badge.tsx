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
  // 숨김 시에도 높이를 유지해 캡스락 토글 시 아래 버튼이 흔들리지 않도록 자리표시 요소 반환.
  // (이전엔 null 을 반환해 높이가 0 → 켜고 끌 때마다 레이아웃이 위아래로 튀었다.)
  if (!visible) return <div className="min-h-[18px]" aria-hidden />;
  return (
    <div className="flex w-fit items-center gap-1 pl-2 text-[12px] font-medium text-holo-purple-mid">
      <CapsIcon />
      Caps Lock이 켜져 있어요
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
