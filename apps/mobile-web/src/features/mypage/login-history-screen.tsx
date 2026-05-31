import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/shared/components/confirm-modal";

type LoginRecord = {
  id: string;
  device: string;
  os: string;
  location: string;
  date: string;
  current?: boolean;
  suspicious?: boolean;
};

const HISTORY: LoginRecord[] = [
  {
    id: "1",
    device: "iPhone 15 Pro",
    os: "iOS 18.2",
    location: "성남시 분당구",
    date: "2026.05.09 21:24",
    current: true,
  },
  {
    id: "2",
    device: "MacBook Pro · Chrome",
    os: "macOS 15",
    location: "서울시 강남구",
    date: "2026.05.08 14:02",
  },
  {
    id: "3",
    device: "iPhone 15 Pro",
    os: "iOS 18.2",
    location: "성남시 분당구",
    date: "2026.05.07 09:11",
  },
  {
    id: "4",
    device: "Galaxy S24 · 카카오톡",
    os: "Android 14",
    location: "부산시 해운대구",
    date: "2026.05.05 23:48",
    suspicious: true,
  },
  {
    id: "5",
    device: "iPad Air · Safari",
    os: "iPadOS 18.1",
    location: "성남시 분당구",
    date: "2026.05.03 19:30",
  },
  {
    id: "6",
    device: "iPhone 15 Pro",
    os: "iOS 18.1",
    location: "성남시 분당구",
    date: "2026.05.01 08:15",
  },
];

export function LoginHistoryScreen() {
  const navigate = useNavigate();
  const [reportId, setReportId] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-holo-line-3 px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          로그인 기록
        </span>
      </header>

      <section className="px-4 pt-2">
        <p className="text-[12px] text-holo-ink-3">
          최근 30일간의 로그인 기록이에요. 본인이 아닌 접속이 보이면 즉시 신고해주세요.
        </p>
      </section>

      <section className="mt-4 px-4 pb-4">
        <ul className="flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {HISTORY.map((rec) => (
            <li key={rec.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DeviceIcon kind={rec.os} />
                  <span className="text-[14px] font-semibold text-holo-ink">
                    {rec.device}
                  </span>
                </div>
                {rec.current && (
                  <span className="rounded-full bg-holo-purple-mid px-2 py-0.5 text-[11px] font-semibold text-white">
                    현재 기기
                  </span>
                )}
                {rec.suspicious && !rec.current && (
                  <span className="rounded-full bg-holo-error px-2 py-0.5 text-[11px] font-semibold text-white">
                    의심 접속
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pl-7 text-[12px] text-holo-ink-3">
                <span>
                  {rec.os} · {rec.location}
                </span>
                <span>{rec.date}</span>
              </div>
              {!rec.current && (
                <div className="mt-1 flex justify-end pl-7">
                  <button
                    type="button"
                    onClick={() => setReportId(rec.id)}
                    className="text-[12px] text-holo-error underline"
                  >
                    이 접속 신고하기
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] leading-5 text-holo-ink-3">
          · IP 주소 기반의 추정 위치이며 실제와 다를 수 있어요.
          <br />· 의심 접속 신고 시 모든 다른 기기에서 자동 로그아웃됩니다.
        </p>
      </section>

      <ConfirmModal
        open={reportId !== null}
        message="이 접속을 신고할까요?"
        description={
          <>
            모든 다른 기기에서 자동 로그아웃되고
            <br />
            비밀번호를 변경하시는 것을 권장해요.
          </>
        }
        confirmLabel="신고"
        onCancel={() => setReportId(null)}
        onConfirm={() => {
          setReportId(null);
          alert("신고가 접수되었어요. 다른 기기에서 로그아웃되었습니다.");
        }}
      />
    </main>
  );
}

function DeviceIcon({ kind }: { kind: string }) {
  const isPhone = /iOS|Android/i.test(kind);
  const isTablet = /iPadOS/i.test(kind);
  if (isPhone) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M11 19h2" />
      </svg>
    );
  }
  if (isTablet) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M11 19h2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7448DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M2 20h20M9 16v4M15 16v4" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
