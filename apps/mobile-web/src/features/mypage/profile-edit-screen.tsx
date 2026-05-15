import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ME } from "@/shared/mock/data";
import { useProfile } from "@/shared/hooks/use-profile";
import { setNickname as storeSetNickname } from "@/shared/stores/profile-store";
import {
  FEMALE_FACES,
  MALE_FACES,
  ME_PERSONA,
} from "@/features/home/home-faces";
import {
  getVerification,
  subscribeVerification,
} from "@/shared/stores/verification-store";

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

  // 본인인증 시 판별된 성별에 따라 캐릭터 후보를 필터링한다.
  const [verification, setVerification] = useState(getVerification);
  useEffect(() => {
    const unsub = subscribeVerification(() => setVerification(getVerification()));
    return unsub;
  }, []);
  const characterOptions =
    verification.gender === "M" ? MALE_FACES : FEMALE_FACES;

  const currentFaceIndex = Math.max(
    0,
    characterOptions.findIndex((f) => f === ME_PERSONA.face),
  );
  const [character, setCharacter] = useState(currentFaceIndex);
  const [bg, setBg] = useState(1);
  const handleCheck = () => {
    setCheck(nickname === "감자는 감자" ? "fail" : "ok");
  };

  const selectedFace = characterOptions[character] ?? characterOptions[0];

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

        {/* 미리보기 — 선택한 캐릭터를 선택한 배경색 위에 둥근 원으로 표시 */}
        <div className="mt-4 flex justify-center">
          <div
            className="flex h-[160px] w-[160px] items-center justify-center rounded-full"
            style={{ background: BG_COLORS[bg] }}
          >
            <img
              src={selectedFace}
              alt="선택된 캐릭터 미리보기"
              className="h-[150px] w-[150px] rounded-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        {/* 캐릭터 — 가로 스크롤(드래그) 가능 */}
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-holo-ink">캐릭터</p>
          <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-[10px]">
              {characterOptions.map((face, i) => (
                <button
                  key={face}
                  type="button"
                  onClick={() => setCharacter(i)}
                  className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-full transition ${
                    character === i ? "ring-[2px] ring-holo-purple-mid" : "opacity-80"
                  }`}
                >
                  <img
                    src={face}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 배경색 */}
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-holo-ink">배경색</p>
          <div className="mt-3 flex gap-[10px]">
            {BG_COLORS.slice(0, 6).map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => setBg(i)}
                className={`h-7 w-7 rounded-full transition ${
                  bg === i
                    ? "ring-[2px] ring-holo-purple-mid ring-offset-1"
                    : ""
                }`}
                style={{ background: c }}
                aria-label={`배경 ${i}`}
              />
            ))}
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
