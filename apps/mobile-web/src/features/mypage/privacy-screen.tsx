import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function PrivacyScreen() {
  const navigate = useNavigate();
  const [shareLocation, setShareLocation] = useState(true);
  const [allowFriendRequest, setAllowFriendRequest] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">개인정보</span>
      </header>

      <section className="px-4 pt-2">
        <p className="text-[12px] text-holo-ink-3">공개 설정</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow
            label="위치 정보 공유"
            hint="동네 인증·지도에서 활용돼요"
            value={shareLocation}
            onChange={setShareLocation}
          />
          <ToggleRow
            label="친구 요청 허용"
            value={allowFriendRequest}
            onChange={setAllowFriendRequest}
          />
        </ul>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">광고 / 마케팅</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow
            label="맞춤 광고 수신"
            hint="관심사 기반의 추천을 받아요"
            value={marketing}
            onChange={setMarketing}
          />
        </ul>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">정책 및 데이터</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <LinkRow label="개인정보 처리방침" onClick={() => navigate("/mypage/privacy/policy")} />
          <LinkRow label="서비스 이용약관" onClick={() => navigate("/mypage/privacy/terms")} />
        </ul>
      </section>

      <section className="mt-4 px-4 pb-4">
        <p className="text-[11px] leading-5 text-holo-ink-3">
          홀로는 사용자의 개인정보를 안전하게 보관하고, 동의한 범위 안에서만 활용해요.
        </p>
      </section>
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
    <li className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col">
        <span className="text-[14px] text-holo-ink">{label}</span>
        {hint && <span className="text-[12px] text-holo-ink-3">{hint}</span>}
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
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] text-holo-ink"
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
