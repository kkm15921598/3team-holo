import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME, BADGES, TITLES } from "@/shared/mock/data";

const HAIR_COUNT = 6;
const BG_COLORS = [
  "#DDC0FF",
  "#FCEBB5",
  "#FFCFCF",
  "#CAE4B9",
  "#C7BDFF",
  "#A3D5FF",
  "#FFE2B7",
  "#E5E5E5",
];

export function ProfileEditScreen() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(ME.nickname);
  const [check, setCheck] = useState<"ok" | "fail" | null>(null);
  const [hair, setHair] = useState(2);
  const [bg, setBg] = useState(1);
  const [badge, setBadge] = useState(1);
  const [titleIdx, setTitleIdx] = useState(0);

  const handleCheck = () => {
    setCheck(nickname === "감자는 감자" ? "fail" : "ok");
  };

  return (
    <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <header className="flex h-12 shrink-0 items-center justify-between px-4">
        <button type="button" aria-label="뒤로" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-[14px] font-semibold text-holo-ink"
        >
          완료
        </button>
      </header>

      {/* Nickname */}
      <section className="px-4">
        <p className="text-[14px] font-semibold text-holo-ink">닉네임</p>
        <div className="mt-2 flex items-center gap-2 rounded-holo-pill border border-holo-line bg-white pl-4 pr-1">
          <input
            value={nickname}
            maxLength={10}
            onChange={(e) => {
              const filtered = e.target.value
                .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ ]/g, "")
                .slice(0, 10);
              setNickname(filtered);
              setCheck(null);
            }}
            className="h-[44px] flex-1 text-[14px] text-holo-ink outline-none"
          />
          <button
            type="button"
            onClick={handleCheck}
            className="rounded-full bg-holo-purple-mid px-4 py-1.5 text-[13px] font-semibold text-white"
          >
            중복확인
          </button>
        </div>
        <p className="mt-1 text-[12px] text-holo-ink-3">한글과 공백 포함 최대 10자, 영어와 특수문자 불가.</p>
        {check === "ok" && <p className="mt-1 text-[13px] text-holo-purple-mid">사용할 수 있는 닉네임입니다!</p>}
        {check === "fail" && <p className="mt-1 text-[13px] text-holo-error">사용할 수 없는 닉네임입니다!</p>}
      </section>

      <Divider />

      {/* Profile image */}
      <section className="px-4">
        <p className="text-[14px] font-semibold text-holo-ink">프로필 이미지</p>
        <div className="mt-3 flex items-start gap-4">
          <div
            className="flex h-[140px] w-[120px] items-center justify-center rounded-[18px]"
            style={{ background: BG_COLORS[bg] }}
          >
            <div className="h-20 w-20 rounded-full bg-holo-yellow-room" />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-[13px] font-semibold text-holo-ink">헤어</p>
              <div className="mt-2 flex gap-2">
                {Array.from({ length: HAIR_COUNT }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHair(i)}
                    className={`relative h-10 w-10 rounded-full bg-holo-yellow-room ${
                      hair === i ? "ring-2 ring-holo-purple-mid ring-offset-1" : ""
                    }`}
                  >
                    {hair === i && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-holo-purple-mid">
                        <CheckMini />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-holo-ink">배경색</p>
              <div className="mt-2 flex gap-2">
                {BG_COLORS.slice(0, 6).map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBg(i)}
                    className={`h-6 w-6 rounded-full ${bg === i ? "ring-2 ring-holo-ink ring-offset-1" : ""}`}
                    style={{ background: c }}
                    aria-label={`배경 ${i}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* Badges */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-holo-ink">나의 뱃지</p>
          <span className="text-[12px] text-holo-ink-3">총 {BADGES.length}개</span>
        </div>
        <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-3">
            {BADGES.map((b) => {
              const on = badge === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBadge(b.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-holo-surface-2 text-[22px]">
                    🏅
                  </span>
                  <span className="text-[10px] text-holo-ink-3">{b.date}</span>
                  <span className="text-[12px] text-holo-ink">{b.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      on ? "border-holo-purple-mid bg-holo-purple-mid" : "border-holo-line bg-white"
                    }`}
                  >
                    {on && <CheckMini />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Divider />

      {/* Titles */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-holo-ink">나의 칭호</p>
          <span className="text-[12px] text-holo-ink-3">총 {TITLES.length}개</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TITLES.map((t, i) => {
            const on = titleIdx === i;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTitleIdx(i)}
                className={`rounded-[20px] border border-holo-line px-3 py-1.5 text-[13px] ${
                  on
                    ? "border-holo-purple-mid text-holo-purple-mid shadow-[inset_0_0_0_1px_#7448DD]"
                    : "text-holo-ink"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Divider() {
  return <div className="my-4 h-[6px] w-full bg-holo-surface-2" />;
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function CheckMini() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 6 6 10-14" />
    </svg>
  );
}
