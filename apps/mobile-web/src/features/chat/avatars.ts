// 닉네임/ID에 따라 일관된 아바타 이미지를 반환하는 헬퍼
// public/illustrations/icons_face/ 하위의 PNG들을 사용

const BASE = "/illustrations/icons_face";

// 카테고리별 파일명 (실제 디스크와 일치)
const FACES = {
  man_man: [
    "Gemini_Generated_Image_29yowa29yowa29yo 7.png",
    "Gemini_Generated_Image_2yfg492yfg492yfg 5.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 7.png",
    "Gemini_Generated_Image_8zak848zak848zak 7.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 10.png",
    "Gemini_Generated_Image_lakj7nlakj7nlakj 4.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 9.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 7.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 7.png",
    "Gemini_Generated_Image_sale38sale38sale 5.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn 7.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 7.png",
  ].map((f) => `${BASE}/man/man/${f}`),
  woman_woman: [
    "Gemini_Generated_Image_29yowa29yowa29yo 5.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 4.png",
    "Gemini_Generated_Image_8zak848zak848zak 4.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 7.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 6.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 4.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 4.png",
    "Gemini_Generated_Image_sale38sale38sale 4.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn 5.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 4.png",
  ].map((f) => `${BASE}/woman/woman/${f}`),
  man_boy: [
    "Gemini_Generated_Image_1kmbpd1kmbpd1kmb 4.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 8.png",
    "Gemini_Generated_Image_6fq25v6fq25v6fq2 3.png",
    "Gemini_Generated_Image_8zak848zak848zak 8.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 11.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 10.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 8.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 8.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 8.png",
  ].map((f) => `${BASE}/man/boy/${f}`),
  woman_girl: [
    "Gemini_Generated_Image_1kmbpd1kmbpd1kmb 3.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 5.png",
    "Gemini_Generated_Image_6fq25v6fq25v6fq2 2.png",
    "Gemini_Generated_Image_8zak848zak848zak 5.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 8.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 7.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 5.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 5.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 5.png",
  ].map((f) => `${BASE}/woman/girl/${f}`),
  man_grandfa: [
    "Gemini_Generated_Image_29yowa29yowa29yo 8.png",
    "Gemini_Generated_Image_2yfg492yfg492yfg 6.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 9.png",
    "Gemini_Generated_Image_8zak848zak848zak 9.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 12.png",
    "Gemini_Generated_Image_lakj7nlakj7nlakj 5.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 11.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 9.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 9.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn 8.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 9.png",
  ].map((f) => `${BASE}/man/grandfa/${f}`),
  woman_grandma: [
    "Gemini_Generated_Image_29yowa29yowa29yo 6.png",
    "Gemini_Generated_Image_4wzr754wzr754wzr 6.png",
    "Gemini_Generated_Image_8zak848zak848zak 6.png",
    "Gemini_Generated_Image_ggx8izggx8izggx8 9.png",
    "Gemini_Generated_Image_mv2mdrmv2mdrmv2m 8.png",
    "Gemini_Generated_Image_n1h0oln1h0oln1h0 6.png",
    "Gemini_Generated_Image_rbemzqrbemzqrbem 6.png",
    "Gemini_Generated_Image_uexnvbuexnvbuexn 6.png",
    "Gemini_Generated_Image_xf9xwvxf9xwvxf9x 6.png",
  ].map((f) => `${BASE}/woman/grandma/${f}`),
};

// 성인 풀(주력) - 채팅은 대부분 성인 위주
const ADULT_POOL = [...FACES.man_man, ...FACES.woman_woman];
// 가끔 등장하는 변형 풀(아이/노인) - 다양성용
const VARIATION_POOL = [
  ...FACES.man_boy,
  ...FACES.woman_girl,
  ...FACES.man_grandfa,
  ...FACES.woman_grandma,
];

/** 남성 프로필 이미지 풀 (성인+소년+노인) — 가입 시 프로필 선택용 */
export const MAN_FACES = [
  ...FACES.man_man,
  ...FACES.man_boy,
  ...FACES.man_grandfa,
].map((p) => encodeURI(p));

/** 여성 프로필 이미지 풀 (성인+소녀+노인) — 가입 시 프로필 선택용 */
export const WOMAN_FACES = [
  ...FACES.woman_woman,
  ...FACES.woman_girl,
  ...FACES.woman_grandma,
].map((p) => encodeURI(p));

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
 * 같은 사람은 어디서 보든 같은 얼굴로 표시됨.
 */
export function getAvatar(nickname: string | undefined | null): string {
  if (!nickname) return ADULT_POOL[0];
  const h = hashString(nickname);
  // 80% 확률로 성인 풀, 20% 확률로 변형 풀(아이/노인) → 다양성
  const useVariation = h % 5 === 0;
  const pool = useVariation ? VARIATION_POOL : ADULT_POOL;
  return pool[h % pool.length];
}

/**
 * 인코딩된 URL을 반환 (공백·특수문자 안전).
 * <img src={...} />에 그대로 넣을 때 사용.
 */
export function getAvatarUrl(nickname: string | undefined | null): string {
  return encodeURI(getAvatar(nickname));
}
