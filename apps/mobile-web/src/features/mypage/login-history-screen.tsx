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

// 실제 로그인 세션/감사 로그 백엔드가 아직 없으므로 가짜 기록을 보여주지 않는다.
// (예전엔 지어낸 기기·위치·"의심 접속" 6건이 하드코딩돼, 데이터를 비워도 항상 떠
//  "로그인 모니터링이 되는 것"처럼 오해를 줬다 — 보안 기능을 가짜로 흉내내는 건 위험.)
// 실제 세션 기록 테이블이 생기면 그 데이터로 채운다.
const HISTORY: LoginRecord[] = [];

export function LoginHistoryScreen() {
  const navigate = useNavigate();
  const [reportId, setReportId] = useState<string | null>(null);

  return (
    <main className="flex flex-1 flex-col bg-white">
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
          최근 로그인 기록이에요. 본인이 아닌 접속이 보이면 즉시 신고해주세요.
        </p>
      </section>

      {HISTORY.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <p className="text-[14px] text-holo-ink-3">아직 로그인 기록이 없어요.</p>
          <p className="text-[12px] text-holo-ink-4">
            로그인 기록 표시는 준비 중이에요.
          </p>
        </section>
      ) : (
      <section className="mt-4 px-4 pb-4">
        <ul className="flex flex-col divide-y divide-holo-line-3">
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
      )}

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
