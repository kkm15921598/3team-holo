import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/shared/components/confirm-modal";

type Provider = {
  id: "kakao" | "naver" | "google" | "apple";
  label: string;
  emoji: string;
  bg: string;
  text: string;
};

const PROVIDERS: Provider[] = [
  { id: "kakao", label: "카카오", emoji: "🟡", bg: "bg-[#FEE500]", text: "text-[#191919]" },
  { id: "naver", label: "네이버", emoji: "🟢", bg: "bg-[#03C75A]", text: "text-white" },
  { id: "google", label: "구글", emoji: "🔵", bg: "bg-white", text: "text-holo-ink" },
  { id: "apple", label: "애플", emoji: "⚫", bg: "bg-black", text: "text-white" },
];

export function AccountLinkScreen() {
  const navigate = useNavigate();
  const [linked, setLinked] = useState<Record<Provider["id"], boolean>>({
    kakao: true,
    naver: false,
    google: false,
    apple: false,
  });
  const [confirmUnlink, setConfirmUnlink] = useState<Provider | null>(null);

  const linkedCount = Object.values(linked).filter(Boolean).length;

  const toggle = (p: Provider) => {
    if (linked[p.id]) {
      // 연동 해제는 마지막 1개일 땐 차단
      if (linkedCount <= 1) {
        alert("최소 1개의 로그인 수단이 연결되어 있어야 해요.");
        return;
      }
      setConfirmUnlink(p);
    } else {
      setLinked((prev) => ({ ...prev, [p.id]: true }));
      alert(`${p.label} 계정이 연동되었어요.`);
    }
  };

  const doUnlink = () => {
    if (!confirmUnlink) return;
    setLinked((prev) => ({ ...prev, [confirmUnlink.id]: false }));
    setConfirmUnlink(null);
  };

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">계정 연동</span>
      </header>

      <section className="px-4 pt-2">
        <p className="text-[12px] text-holo-ink-3">
          여러 계정을 연결해두면 다양한 방식으로 로그인할 수 있어요.
        </p>
        <p className="mt-1 text-[12px] text-holo-purple-mid">
          현재 {linkedCount}개의 계정이 연결되어 있어요.
        </p>
      </section>

      <section className="mt-4 px-4">
        <ul className="flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {PROVIDERS.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[16px] ${p.bg} ${p.text} border border-holo-line-3`}
                >
                  {p.emoji}
                </span>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-holo-ink">
                    {p.label}
                  </span>
                  <span className="text-[12px] text-holo-ink-3">
                    {linked[p.id] ? "연결됨" : "연결되지 않음"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(p)}
                className={`h-8 rounded-full px-3 text-[12px] font-semibold transition ${
                  linked[p.id]
                    ? "border border-holo-line text-holo-ink-2"
                    : "bg-holo-purple-mid text-white"
                }`}
              >
                {linked[p.id] ? "연결 해제" : "연결하기"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[11px] leading-5 text-holo-ink-3">
          · 연결된 계정으로 로그인하면 동일한 HOLO 계정으로 접속됩니다.
          <br />· 연결 해제 후에도 다른 로그인 수단으로 계속 이용할 수 있어요.
          <br />· 마지막 남은 1개의 로그인 수단은 해제할 수 없어요.
        </p>
      </section>

      <ConfirmModal
        open={confirmUnlink !== null}
        message={`${confirmUnlink?.label ?? ""} 연결을 해제할까요?`}
        description={
          <>
            해제 후에는 {confirmUnlink?.label} 계정으로
            <br />
            더 이상 로그인할 수 없어요.
          </>
        }
        confirmLabel="해제"
        onCancel={() => setConfirmUnlink(null)}
        onConfirm={doUnlink}
      />
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
