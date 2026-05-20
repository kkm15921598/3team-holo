// 닉네임/ID에 따라 일관된 아바타 이미지를 반환하는 헬퍼
// public/illustrations/icons_face/ 하위의 PNG들을 사용
//
// ── 성별 일관성 ──────────────────────────────────────────
// 우리 앱은 본인인증으로 가입 시 남/여를 결정하고, 그 성별에 맞는 얼굴 풀에서만
// 프로필을 고르도록 설계됐다. 따라서 다른 사용자(게시글 작성자) 아바타도
// "이 닉네임의 성별" 과 일치하는 풀에서만 골라야 게시판 성별 필터(남자/여자)와
// 시각이 어긋나지 않는다. getAvatar 는 아래 우선순위로 얼굴을 결정한다:
//   1) PERSONAS 에 고정 얼굴이 있으면 그대로 사용 (그 자체로 성별 일치)
//   2) 그 외엔 getAuthorGender 로 성별을 먼저 결정하고, 해당 성별 풀에서만 해시로 선택
import { personaByName } from "@/features/home/home-faces";
import { getAuthorGender } from "@/shared/lib/author-gender";

const BASE = "/illustrations/icons_face";

// 카테고리별 파일명 (실제 디스크와 일치)
const FACES = {
  man_man: [
    "Gemini_Generated_Image_29yowa29yowa29yo_7.png",
    "Gemini_Generated_Image_2yfg492yfg492yfg_5.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_7.png",
    "Gemini_Generated_Image_8zak848zak848zak_7.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_10.png",
    "Gemini_Generated_Image_lakj7nlakj7nlakj_4.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_9.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_7.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_7.png",
    "Gemini_Generated_Image_sale38sale38sale_5.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn_7.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_7.png",
  ].map((f) => `${BASE}/man/man/${f}`),
  woman_woman: [
    "Gemini_Generated_Image_29yowa29yowa29yo_5.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_4.png",
    "Gemini_Generated_Image_8zak848zak848zak_4.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_7.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_6.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_4.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_4.png",
    "Gemini_Generated_Image_sale38sale38sale_4.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn_5.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_4.png",
  ].map((f) => `${BASE}/woman/woman/${f}`),
  man_boy: [
    "Gemini_Generated_Image_1kmbpd1kmbpd1kmb_4.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_8.png",
    "Gemini_Generated_Image_6fq25v6fq25v6fq2_3.png",
    "Gemini_Generated_Image_8zak848zak848zak_8.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_11.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_10.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_8.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_8.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_8.png",
  ].map((f) => `${BASE}/man/boy/${f}`),
  woman_girl: [
    "Gemini_Generated_Image_1kmbpd1kmbpd1kmb_3.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_5.png",
    "Gemini_Generated_Image_6fq25v6fq25v6fq2_2.png",
    "Gemini_Generated_Image_8zak848zak848zak_5.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_8.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_7.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_5.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_5.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_5.png",
  ].map((f) => `${BASE}/woman/girl/${f}`),
  man_grandfa: [
    "Gemini_Generated_Image_29yowa29yowa29yo_8.png",
    "Gemini_Generated_Image_2yfg492yfg492yfg_6.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_9.png",
    "Gemini_Generated_Image_8zak848zak848zak_9.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_12.png",
    "Gemini_Generated_Image_lakj7nlakj7nlakj_5.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_11.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_9.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_9.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn_8.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_9.png",
  ].map((f) => `${BASE}/man/grandfa/${f}`),
  woman_grandma: [
    "Gemini_Generated_Image_29yowa29yowa29yo_6.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr_6.png",
    "Gemini_Generated_Image_8zak848zak848zak_6.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8_9.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m_8.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0_6.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem_6.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn_6.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x_6.png",
  ].map((f) => `${BASE}/woman/grandma/${f}`),
};

// 성별별 풀 — 성인 위주 + 가끔 등장하는 변형(소년·소녀·노인) 으로 다양성 부여.
// getAvatar 는 닉네임의 성별을 먼저 판정한 뒤 같은 성별 풀에서만 얼굴을 고른다.
const MAN_ADULT_POOL = [...FACES.man_man];
const MAN_VARIATION_POOL = [...FACES.man_boy, ...FACES.man_grandfa];
const WOMAN_ADULT_POOL = [...FACES.woman_woman];
const WOMAN_VARIATION_POOL = [...FACES.woman_girl, ...FACES.woman_grandma];

// 닉네임 없는(=null/undefined) 경우의 폴백 — 임의 성인 얼굴 한 장.
const DEFAULT_FACE = MAN_ADULT_POOL[0];

/** 남성 프로필 이미지 풀 (성인+소년+노인) — 가입 시 프로필 선택용 */
export const MAN_FACES = [
  ...FACES.man_man,
  ...FACES.man_boy,
  ...FACES.man_grandfa,
];

/** 여성 프로필 이미지 풀 (성인+소녀+노인) — 가입 시 프로필 선택용 */
export const WOMAN_FACES = [
  ...FACES.woman_woman,
  ...FACES.woman_girl,
  ...FACES.woman_grandma,
];

// 닉네임 → 안정적인 정수 해시 (FNV-1a 변형)
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 닉네임에 따라 항상 같은 아바타 URL을 반환.
 * 같은 사람은 어디서 보든 같은 얼굴로 표시되고, 그 얼굴은 getAuthorGender 가
 * 판정한 성별과 항상 일치한다 — 게시판 성별 필터(남자/여자) 결과와 시각 정합.
 */
export function getAvatar(nickname: string | undefined | null): string {
  if (!nickname) return DEFAULT_FACE;
  // 1) PERSONAS 에 고정 얼굴이 있으면 그대로 사용 (얼굴 경로의 /man/ 또는 /woman/
  //    이 곧 그 닉네임의 성별이므로 자동으로 일치).
  const persona = personaByName(nickname);
  if (persona) return persona.face;
  // 2) 그 외 닉네임은 성별 판정 후 같은 성별 풀에서만 해시로 얼굴 선택.
  //    80% 성인 풀 / 20% 변형 풀(소년·소녀·노인) 로 다양성 유지.
  const h = hashString(nickname);
  const gender = getAuthorGender(nickname);
  const useVariation = h % 5 === 0;
  const pool =
    gender === "M"
      ? useVariation
        ? MAN_VARIATION_POOL
        : MAN_ADULT_POOL
      : useVariation
        ? WOMAN_VARIATION_POOL
        : WOMAN_ADULT_POOL;
  return pool[h % pool.length];
}

/**
 * 인코딩된 URL을 반환 (공백·특수문자 안전).
 * <img src={...} />에 그대로 넣을 때 사용.
 */
export function getAvatarUrl(nickname: string | undefined | null): string {
  return getAvatar(nickname);
}
