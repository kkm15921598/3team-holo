import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";
import { useProfile } from "@/shared/hooks/use-profile";
import { setNickname as storeSetNickname } from "@/shared/stores/profile-store";

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
  const profile = useProfile();
  const [nickname, setNickname] = useState(profile.nickname);
  const [check, setCheck] = useState<"ok" | "fail" | null>(null);
  const [hair, setHair] = useState(2);
  const [bg, setBg] = useState(1);
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
          onClick={() => {
            if (check === "ok") storeSetNickname(nickname);
            navigate(-1);
          }}
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
        <p className="mt-1 text-[12px] text-holo-ink-3">한글과 공백 포함 최대 10자 / 영어, 특수문자, 비속어 불가</p>
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
