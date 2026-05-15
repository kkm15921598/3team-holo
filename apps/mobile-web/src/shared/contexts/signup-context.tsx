import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * 가입 흐름 (terms → verification → account → nickname → interest → review)에서
 * 입력값을 단계 간에 공유/보존하기 위한 Context.
 *
 * - 라우트 이동으로 화면이 unmount되어도 Provider는 그대로 살아있어서 입력값 유지
 * - 뒤로가기로 이전 단계로 돌아가도 이미 채운 값이 그대로 보임
 * - "정말 나가시겠어요?" 모달의 트리거로 isDirty 사용
 */

export type AgreedTerms = Record<string, boolean>;

export type Gender = "M" | "F" | null;

export type SignupData = {
  // 1. terms
  agreedTerms: AgreedTerms;
  // 2. verification
  name: string;
  idNum: string;
  carrier: string | null;
  phone: string;
  phoneVerified: boolean;
  // 주민번호 뒷자리 첫 숫자로 자동 인식
  gender: Gender;
  // 3. account
  userId: string;
  password: string;
  // 4. nickname & 프로필 이미지
  nickname: string;
  profileFace: string | null;
  // 5. interest
  interests: string[];
  customInterest: string;
};

const INITIAL_DATA: SignupData = {
  agreedTerms: {},
  name: "",
  idNum: "",
  carrier: null,
  phone: "",
  phoneVerified: false,
  gender: null,
  userId: "",
  password: "",
  nickname: "",
  profileFace: null,
  interests: [],
  customInterest: "",
};

/** 주민번호 뒷자리 첫 숫자로 성별 판단 (1·3·5·7·9 = 남, 2·4·6·8·0 = 여) */
export function genderFromIdNum(idNum: string): Gender {
  if (idNum.length < 7) return null;
  const digit = idNum.charAt(6);
  if (!/[0-9]/.test(digit)) return null;
  const n = Number(digit);
  if (n === 0) return "F";
  return n % 2 === 1 ? "M" : "F";
}

type SignupContextValue = {
  data: SignupData;
  update: <K extends keyof SignupData>(key: K, value: SignupData[K]) => void;
  reset: () => void;
  isDirty: boolean;
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SignupData>(INITIAL_DATA);

  const update = useCallback(
    <K extends keyof SignupData>(key: K, value: SignupData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setData(INITIAL_DATA), []);

  // 의미있는 입력값이 하나라도 들어가있으면 dirty로 간주.
  const isDirty =
    Object.values(data.agreedTerms).some(Boolean) ||
    !!data.name ||
    !!data.idNum ||
    !!data.carrier ||
    !!data.phone ||
    !!data.userId ||
    !!data.password ||
    !!data.nickname ||
    !!data.profileFace ||
    data.interests.length > 0 ||
    !!data.customInterest;

  return (
    <SignupContext.Provider value={{ data, update, reset, isDirty }}>
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) {
    throw new Error("useSignup must be used inside <SignupProvider>");
  }
  return ctx;
}
