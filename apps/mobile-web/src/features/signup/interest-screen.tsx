import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignupLayout } from "./signup-layout";

const TAGS = [
  "공동구매",
  "소분",
  "게임",
  "OTT",
  "운동",
  "드라마",
  "영화",
  "먹거리",
  "도움",
  "나눔",
  "맛집",
  "소통",
  "단기성 소모임",
  "장기성 소모임",
];

export function InterestScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [customActive, setCustomActive] = useState(false);

  const toggle = (tag: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const canNext = selected.size > 0 || custom.trim().length > 0;

  return (
    <SignupLayout step={4}>
      <h1 className="text-[20px] font-bold leading-snug text-holo-ink">
        어떤 주제에
        <br />
        관심이 있으신가요?
      </h1>
      <p className="mt-2 text-[14px] text-holo-ink-3">AI를 활용해 딱 맞는 콘텐츠를 보여드립니다.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {TAGS.map((tag) => {
          const on = selected.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`flex items-center gap-1 rounded-[20px] px-5 py-2 text-[14px] transition ${
                on
                  ? "border-2 border-holo-purple-mid text-holo-purple-mid"
                  : "border border-holo-line text-holo-ink"
              }`}
            >
              <span className={on ? "text-holo-purple-mid" : "text-holo-ink-4"}>+</span>
              {tag}
            </button>
          );
        })}
        {customActive ? (
          <input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => {
              if (!custom.trim()) setCustomActive(false);
            }}
            placeholder="직접 입력하세요"
            className="rounded-[20px] border-2 border-holo-purple-mid bg-white px-5 py-2 text-[14px] text-holo-purple-mid outline-none placeholder:text-holo-ink-4"
          />
        ) : (
          <button
            type="button"
            onClick={() => setCustomActive(true)}
            className="flex items-center gap-1 rounded-[20px] border border-holo-line px-5 py-2 text-[14px] text-holo-ink"
          >
            <span className="text-holo-ink-4">+</span>
            직접 입력
          </button>
        )}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pt-6">
        <p className="text-[12px] text-holo-ink-3">나중에 다시 수정할 수 있어요!</p>
        <button
          type="button"
          onClick={() => canNext && navigate("/signup/room")}
          disabled={!canNext}
          className={`h-[60px] w-full rounded-holo-pill text-[16px] font-semibold text-white transition active:scale-[0.99] ${
            canNext ? "bg-holo-ink" : "bg-holo-ink-4"
          }`}
        >
          다음
        </button>
      </div>
    </SignupLayout>
  );
}
