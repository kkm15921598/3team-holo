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
import { containsProfanity } from "@/shared/utils/profanity";
import { supabase } from "@/shared/lib/supabaseClient";

// 가입(nickname-screen)과 동일한 닉네임 규칙 — 프로필 편집에도 같은 검증을 적용한다.
const KOREAN_ONLY = /^[가-힣\s]+$/;
const MAX_LEN = 10;
const RESERVED_NICKNAMES = ["관리자", "운영자", "테스트", "어드민", "admin", "holo", "홀로"];

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
  // 닉네임 중복확인 — 이전엔 하드코딩("감자는 감자"만 fail)이라 빈값/중복/비속어가
  // 전부 통과했다. 가입 화면과 동일하게 형식·비속어·예약어·Supabase 중복을 실제 검증한다.
  const handleCheck = async () => {
    // 천지인 결합점('·')은 조합 중간 문자라 검증 전에 제거 — 입력은 허용하지만
    // 완성형만 받는 KOREAN_ONLY 검증에서 '·'가 남아 거부되던 불일치 방지.
    const trimmed = nickname.trim().replace(/·/g, "");
    if (
      trimmed.length === 0 ||
      !KOREAN_ONLY.test(trimmed) ||
      trimmed.length > MAX_LEN ||
      containsProfanity(trimmed) ||
      RESERVED_NICKNAMES.includes(trimmed)
    ) {
      setCheck("fail");
      return;
    }
    // 내 현재 닉네임 그대로면 중복 조회 없이 통과.
    if (trimmed === profile.nickname.trim()) {
      setCheck("ok");
      return;
    }
    try {
      const { data: rows, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("nickname", trimmed)
        .limit(1);
      // 네트워크 오류 시엔 가입 화면과 동일하게 통과 처리(오프라인 편집 허용).
      setCheck(error ? "ok" : rows && rows.length > 0 ? "fail" : "ok");
    } catch {
      setCheck("ok");
    }
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
            const trimmed = nickname.trim();
            const nickChanged = trimmed !== profile.nickname.trim();
            // 닉네임을 바꿨는데 중복확인을 통과하지 않았으면 저장/이탈을 막고 확인을 유도한다.
            // (이전엔 닉네임은 저장 안 되면서 얼굴만 저장되고 그대로 빠져나가 상태가 어긋났다.
            //  닉네임을 안 바꾸고 얼굴만 변경하는 흐름은 그대로 통과시킨다.)
            if (nickChanged && check !== "ok") {
              setCheck("fail");
              return;
            }
            if (check === "ok" && trimmed.length > 0) storeSetNickname(trimmed);
            // 닉네임 저장과 함께(또는 얼굴만 변경 시) 선택한 캐릭터 얼굴 저장.
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
