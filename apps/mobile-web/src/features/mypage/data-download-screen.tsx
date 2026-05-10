import { useState } from "react";
import { useNavigate } from "react-router-dom";

type DataCategory = {
  id: string;
  label: string;
  hint: string;
  defaultOn: boolean;
};

const CATEGORIES: DataCategory[] = [
  { id: "profile", label: "프로필 정보", hint: "닉네임, 이메일, 휴대폰, 관심사", defaultOn: true },
  { id: "posts", label: "내가 쓴 글·댓글", hint: "게시판/모임 작성 이력", defaultOn: true },
  { id: "chat", label: "채팅 메시지", hint: "1:1·그룹 채팅 텍스트", defaultOn: false },
  { id: "friends", label: "친구·차단 목록", hint: "내 인맥 및 차단 기록", defaultOn: true },
  { id: "points", label: "포인트·뱃지 내역", hint: "적립·사용 이력", defaultOn: true },
  { id: "logs", label: "로그인·접속 기록", hint: "최근 30일 접속 로그", defaultOn: false },
];

type Format = "json" | "csv";

export function DataDownloadScreen() {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.id, c.defaultOn])),
  );
  const [format, setFormat] = useState<Format>("json");
  const [submitted, setSubmitted] = useState(false);

  const pickedCount = Object.values(picked).filter(Boolean).length;
  const canSubmit = pickedCount > 0;

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">
          내 데이터 다운로드
        </span>
      </header>

      <section className="px-4 pt-2">
        <p className="text-[13px] text-holo-ink-3">
          요청하신 데이터를 모아서 등록 이메일로 다운로드 링크를 보내드려요.
          {"\n"}준비까지 최대 24시간이 걸릴 수 있어요.
        </p>
      </section>

      {/* 항목 선택 */}
      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">받을 항목 선택</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col">
                <span className="text-[14px] text-holo-ink">{c.label}</span>
                <span className="text-[12px] text-holo-ink-3">{c.hint}</span>
              </div>
              <Checkbox
                checked={picked[c.id]}
                onChange={(v) => setPicked((p) => ({ ...p, [c.id]: v }))}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 파일 형식 */}
      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">파일 형식</p>
        <div className="mt-2 flex gap-2">
          <FormatTile
            active={format === "json"}
            label="JSON"
            hint="구조화된 데이터"
            onClick={() => setFormat("json")}
          />
          <FormatTile
            active={format === "csv"}
            label="CSV"
            hint="엑셀에서 열기 좋아요"
            onClick={() => setFormat("csv")}
          />
        </div>
      </section>

      <section className="mt-4 px-4">
        <p className="text-[11px] leading-5 text-holo-ink-3">
          · 다운로드 링크는 발송일로부터 7일간 유효해요.
          {"\n"}· 본인 확인을 위해 비밀번호를 한 번 더 요구할 수 있어요.
          {"\n"}· 데이터는 GDPR / 개인정보보호법 기준에 따라 제공돼요.
        </p>
      </section>

      <div className="mt-auto px-4 pb-4 pt-6">
        <button
          type="button"
          onClick={() => canSubmit && setSubmitted(true)}
          disabled={!canSubmit}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canSubmit ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          {pickedCount > 0 ? `${pickedCount}개 항목 요청하기` : "항목을 선택해주세요"}
        </button>
      </div>

      {submitted && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[300px] rounded-[14px] bg-white p-5 text-center">
            <p className="text-[14px] font-semibold text-holo-ink">
              요청이 접수되었어요!
            </p>
            <p className="mt-2 text-[12px] text-holo-ink-3">
              준비가 끝나면 등록 이메일로
              <br />
              다운로드 링크를 보내드릴게요.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                navigate(-1);
              }}
              className="mt-4 h-10 w-full rounded-full bg-holo-purple-mid text-[13px] font-semibold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${
        checked
          ? "border-holo-purple-mid bg-holo-purple-mid"
          : "border-holo-line bg-white"
      }`}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m4 12 6 6 10-14" />
        </svg>
      )}
    </button>
  );
}

function FormatTile({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-1 rounded-holo-input p-4 text-left transition ${
        active
          ? "border-2 border-holo-purple-mid bg-white"
          : "border border-holo-line-3 bg-white"
      }`}
    >
      <span
        className={`text-[15px] font-semibold ${
          active ? "text-holo-purple-mid" : "text-holo-ink"
        }`}
      >
        {label}
      </span>
      <span className="text-[12px] text-holo-ink-3">{hint}</span>
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
