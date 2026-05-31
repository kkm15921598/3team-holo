import { useNavigate } from "react-router-dom";
import { privacyStore, usePrivacy } from "@/shared/stores/privacy-store";

export function PrivacyScreen() {
  const navigate = useNavigate();
  // privacyStore 를 구독해 다른 화면(친구 요청·지도·광고)과 동일한 단일 출처에서 값을 읽고 쓴다.
  const { shareLocation, allowFriendRequest, marketing } = usePrivacy();

  return (
    <main className="flex flex-1 flex-col bg-white pb-6">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">개인정보</span>
      </header>

      {/* 공개 설정 */}
      <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">공개 설정</p>
      <ul className="flex flex-col divide-y divide-holo-line-3">
        <ToggleRow
          label="위치 정보 공유"
          hint="동네 인증·지도에서 활용돼요"
          value={shareLocation}
          onChange={(v) => privacyStore.set("shareLocation", v)}
        />
        <ToggleRow
          label="친구 요청 허용"
          value={allowFriendRequest}
          onChange={(v) => privacyStore.set("allowFriendRequest", v)}
        />
      </ul>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 광고 / 마케팅 */}
      <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">광고 / 마케팅</p>
      <ul className="flex flex-col divide-y divide-holo-line-3">
        <ToggleRow
          label="맞춤 광고 수신"
          hint="관심사 기반의 추천을 받아요"
          value={marketing}
          onChange={(v) => privacyStore.set("marketing", v)}
        />
      </ul>

      <div className="h-2 shrink-0 bg-holo-surface-2" />

      {/* 정책 및 데이터 */}
      <p className="px-4 pb-1 pt-4 text-[13px] font-medium text-holo-ink-3">정책 및 데이터</p>
      <ul className="flex flex-col divide-y divide-holo-line-3">
        <LinkRow label="개인정보 처리방침" onClick={() => navigate("/mypage/privacy/policy")} />
        <LinkRow label="서비스 이용약관" onClick={() => navigate("/mypage/privacy/terms")} />
      </ul>
    </main>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex min-h-[56px] items-center justify-between px-4 py-2">
      <div className="flex flex-col">
        <span className="text-[15px] text-holo-ink">{label}</span>
        {hint && <span className="mt-0.5 text-[12px] text-holo-ink-3">{hint}</span>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </li>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[56px] w-full items-center justify-between px-4 text-left text-[15px] text-holo-ink active:bg-holo-surface-2"
      >
        <span>{label}</span>
        <ChevronRightIcon />
      </button>
    </li>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition ${
        value ? "bg-holo-purple-mid" : "bg-holo-line"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow transition ${
          value ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
