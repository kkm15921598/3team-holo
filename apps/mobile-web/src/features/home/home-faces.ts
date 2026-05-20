/** Profile face icon library — paired by nickname → image path */
const ROOT = "/illustrations/icons_face";
const PFX = "Gemini_Generated_Image_";

const enc = (folder: string, name: string) =>
  `${ROOT}/${folder}/${PFX}${name}.png`;

/** A nickname paired with a profile face image URL */
export type Persona = { name: string; face: string };

/** Persona library — each nickname has a fixed face */
export const PERSONAS: Persona[] = [
  // women / girls
  { name: "춤추는 토끼", face: enc("woman/girl", "1kmbpd1kmbpd1kmb_3") },
  { name: "노래하는 햇살", face: enc("woman/girl", "4wzr754wzr754wzr_5") },
  { name: "사진찍는 사슴", face: enc("woman/girl", "6fq25v6fq25v6fq2_2") },
  { name: "발랄한 코스모스", face: enc("woman/girl", "8zak848zak848zak_5") },
  { name: "사랑스러운 백합", face: enc("woman/woman", "29yowa29yowa29yo_5") },
  { name: "산뜻한 봄", face: enc("woman/woman", "4wzr754wzr754wzr_4") },
  { name: "반짝이는 별", face: enc("woman/woman", "8zak848zak848zak_4") },
  { name: "다정한 별빛", face: enc("woman/woman", "ggx8izggx8izggx8_7") },
  { name: "다정한 토끼", face: enc("woman/grandma", "29yowa29yowa29yo_6") },
  { name: "정겨운 단풍", face: enc("woman/grandma", "4wzr754wzr754wzr_6") },
  // men / boys
  { name: "산책하는 강아지", face: enc("man/boy", "1kmbpd1kmbpd1kmb_4") },
  { name: "씩씩한 사슴", face: enc("man/boy", "4wzr754wzr754wzr_8") },
  { name: "재밌는 너구리", face: enc("man/boy", "6fq25v6fq25v6fq2_3") },
  { name: "용감한 곰", face: enc("man/man", "29yowa29yowa29yo_7") },
  { name: "그림그리는 곰", face: enc("man/man", "2yfg492yfg492yfg_5") },
  { name: "신나는 펭귄", face: enc("man/man", "4wzr754wzr754wzr_7") },
  { name: "글쓰는 부엉이", face: enc("man/man", "8zak848zak848zak_7") },
  { name: "빛나는 해바라기", face: enc("man/man", "ggx8izggx8izggx8_10") },
  { name: "책읽는 알파카", face: enc("man/grandfa", "29yowa29yowa29yo_8") },
  { name: "씩씩한 늑대", face: enc("man/grandfa", "4wzr754wzr754wzr_9") },
];

/** Lookup persona by name (returns first match or undefined) */
export function personaByName(name: string): Persona | undefined {
  return PERSONAS.find((p) => p.name === name);
}

/** Picks N personas deterministically from a seed */
export function pickPersonas(seed: number, count: number): Persona[] {
  const result: Persona[] = [];
  const len = PERSONAS.length;
  for (let i = 0; i < count; i++) {
    result.push(PERSONAS[(seed * 7 + i * 11) % len]);
  }
  return result;
}

/** 기본 여성 프로필 얼굴 — profileFace 미설정 시 fallback 이미지 */
export const ME_PERSONA: Persona = {
  name: "",
  face: enc("woman/girl", "ggx8izggx8izggx8_8"),
};

/** 프로필 편집에서 사용하는 성별별 캐릭터 후보 (얼굴만 추려서 노출).
 *  본인인증 시 판별된 성별에 따라 한 쪽 리스트만 노출된다. */
export const FEMALE_FACES: string[] = [
  ME_PERSONA.face,
  ...PERSONAS.filter((p) => p.face.includes("/woman/")).map((p) => p.face),
];

export const MALE_FACES: string[] = PERSONAS.filter((p) =>
  p.face.includes("/man/"),
).map((p) => p.face);

/** 성별별 기본 프로필 얼굴 — profileFace 가 비어있을 때 fallback 으로 사용 */
export const FEMALE_DEFAULT_FACE: string = ME_PERSONA.face;
export const MALE_DEFAULT_FACE: string = MALE_FACES[0];

export function defaultFaceForGender(gender: "M" | "F"): string {
  return gender === "M" ? MALE_DEFAULT_FACE : FEMALE_DEFAULT_FACE;
}
CE;
}
