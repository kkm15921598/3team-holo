import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/shared/hooks/use-profile";
import {
  setNickname as storeSetNickname,
  setProfileFace as storeSetProfileFace,
} from "@/shared/stores/profile-store";
import { ME_PERSONA } from "@/features/home/home-faces";
// 가입 흐름과 동일한 풀(성인+소년/소녀+노인 전부 포함) 을 사용 — 가입 때와 옵션 수가 동일해야 사용자가 같은 선택지를 본다.
import { MAN_FACES, WOMAN_FACES } from "@/features/chat/avatars";
import {
  getVerification,
  subscribeVerification,
} from "@/shared/stores/verification-store";

export function ProfileEditScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [nickname, setNickname] = useState(profile.nickname);
  const [check, setCheck] = useState<"ok" | "fail" | null>(null);

  // 본인인증 시 판별된 성별 — 신규 가입자에겐 verification.gender 가 진실이다.
  const [verification, setVerification] = useState(getVerification);
  useEffect(() => {
    const unsub = subscribeVerification(() => setVerification(getVerification()));
    return unsub;
  }, []);

  // 캐릭터 옵션 결정 로직:
  //  1) 현재 저장된 profileFace 의 경로(/man/ vs /woman/) 가 있으면 그쪽을 기준으로 — 마이페이지에
  //     남자 얼굴이 떠 있는데 편집창에선 여자만 보이는 desync 를 막는다.
  //  2) profileFace 가 없으면 verification.gender 로 폴백 ("F" 또는 null 일 땐 FEMALE).
  //  3) 둘 다 모르면 FEMALE 기본.
  const initialFace = profile.profileFace ?? ME_PERSONA.face;
  const inferredGender: "M" | "F" = initialFace.includes("/man/")
    ? "M"
    : initialFace.includes("/woman/")
      ? "F"
      : verification.gender === "M"
        ? "M"
        : "F";
  const characterOptions = inferredGender === "M" ? MAN_FACES : WOMAN_FACES;

  const currentFaceIndex = Math.max(
    0,
    characterOptions.findIndex((f) => f === initialFace),
  );
  const [character, setCharacter] = useState(currentFaceIndex);
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
            // 선택한 캐릭터 얼굴도 함께 저장
            if (selectedFace) storeSetProfileFace(selectedFace);
            navigate(-1);
          }}
          className="text-[14px] font-semibold text-holo-ink"
        >
          완료
        </button>
      </header>

      {/* Nickname — 안드로이드에서 input 의 기본 min-width 가 커서 버튼이 화면 밖으로
          밀려나는 문제가 있어, 컨테이너는 overflow-hidden, input 은 min-w-0,
          버튼은 shrink-0 로 항상 컨테이너 안에 보이도록 강제한다. */}
      <section className="px-4">
        <p className="text-[14px] font-semibold text-holo-ink">닉네임</p>
        <div className="mt-2 flex w-full items-center gap-2 overflow-hidden rounded-holo-pill border border-holo-line bg-white pl-4 pr-1">
          <input
            value={nickname}
            maxLength={10}
            onChange={(e) => {
              // 한글 스크립트 전체 + 공백 + 천지인 "·" 허용 (천지인 키보드 조합 호환).
              const filtered = e.target.value
                .replace(/[^\p{Script=Hangul}· ]/gu, "")
                .slice(0, 10);
              setNickname(filtered);
              setCheck(null);
            }}
            className="h-[44px] min-w-0 flex-1 bg-transparent text-[14px] text-holo-ink outline-none"
          />
          <button
            type="button"
            onClick={handleCheck}
            className="shrink-0 rounded-full bg-holo-purple-mid px-4 py-1.5 text-[13px] font-semibold text-white"
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

        {/* 미리보기 — 선택한 캐릭터를 둥근 원으로 표시 (배경 없이 프로필 사진만) */}
        <div className="mt-4 flex justify-center">
          <img
            src={selectedFace}
            alt="선택된 캐릭터 미리보기"
            className="h-[160px] w-[160px] rounded-full object-cover"
            draggable={false}
          />
        </div>

        {/* 캐릭터 — 가로 스크롤(드래그) 가능. 선택 시 보라 ring 이 잘리지 않도록
            컨테이너에 세로 padding 을 줘 ring 공간을 확보한다. */}
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-holo-ink">캐릭터</p>
          <div className="-mx-4 mt-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-[10px]">
              {characterOptions.map((face, i) => (
                <button
                  key={face}
                  type="button"
                  onClick={() => setCharacter(i)}
                  className={`relative h-11 w-11 shrink-0 rounded-full transition ${
                    character === i
                      ? "ring-2 ring-holo-purple-mid ring-offset-1"
                      : "opacity-80"
                  }`}
                >
                  <img
                    src={face}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
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
