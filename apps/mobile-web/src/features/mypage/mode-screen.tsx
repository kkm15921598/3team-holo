import { useState } from "react";
import { useNavigate } from "react-router-dom";

type ThemeMode = "light" | "dark" | "system";
type FontScale = "small" | "medium" | "large";

const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string; emoji: string }[] = [
  { id: "light", label: "라이트 모드", hint: "기본 밝은 화면", emoji: "☀️" },
  { id: "dark", label: "다크 모드", hint: "어두운 환경에서 눈이 편해요", emoji: "🌙" },
  { id: "system", label: "시스템 설정", hint: "기기 설정을 따라가요", emoji: "📱" },
];

const FONT_OPTIONS: { id: FontScale; label: string; preview: string }[] = [
  { id: "small", label: "작게", preview: "Aa" },
  { id: "medium", label: "보통", preview: "Aa" },
  { id: "large", label: "크게", preview: "Aa" },
];

export function ModeScreen() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [font, setFont] = useState<FontScale>("medium");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <span className="ml-2 text-[16px] font-semibold text-holo-ink">모드 설정</span>
      </header>

      {/* 테마 */}
      <section className="px-4 pt-2">
        <p className="text-[12px] text-holo-ink-3">화면 테마</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          {THEME_OPTIONS.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => setTheme(opt.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-holo-lilac-card text-[18px]">
                    {opt.emoji}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-semibold text-holo-ink">
                      {opt.label}
                    </span>
                    <span className="text-[12px] text-holo-ink-3">{opt.hint}</span>
                  </div>
                </div>
                <Radio selected={theme === opt.id} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 글자 크기 */}
      <section className="mt-4 px-4">
        <p className="text-[12px] text-holo-ink-3">글자 크기</p>
        <div className="mt-2 flex gap-2">
          {FONT_OPTIONS.map((opt) => {
            const active = font === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFont(opt.id)}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-holo-input py-4 transition ${
                  active
                    ? "border-2 border-holo-purple-mid bg-white text-holo-purple-mid"
                    : "border border-holo-line-3 bg-white text-holo-ink-2"
                }`}
              >
                <span
                  className={`font-semibold ${
                    opt.id === "small"
                      ? "text-[16px]"
                      : opt.id === "medium"
                        ? "text-[20px]"
                        : "text-[26px]"
                  }`}
                >
                  {opt.preview}
                </span>
                <span className="text-[12px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-holo-ink-3">
          앱 전반의 본문 글자 크기에 적용돼요.
        </p>
      </section>

      {/* 접근성 */}
      <section className="mt-4 px-4 pb-4">
        <p className="text-[12px] text-holo-ink-3">접근성</p>
        <ul className="mt-2 flex flex-col divide-y divide-holo-line-3 rounded-holo-input bg-white shadow-holo-card">
          <ToggleRow
            label="애니메이션 줄이기"
            hint="화면 전환·움직임을 최소화해요"
            value={reduceMotion}
            onChange={setReduceMotion}
          />
          <ToggleRow
            label="고대비 모드"
            hint="텍스트와 버튼의 대비를 높여요"
            value={highContrast}
            onChange={setHighContrast}
          />
        </ul>
      </section>
    </main>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
        selected ? "border-holo-purple-mid" : "border-holo-line"
      }`}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-holo-purple-mid" />}
    </span>
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
