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

export type SignupData = {
  // 1. terms
  agreedTerms: AgreedTerms;
  // 2. verification
  name: string;
  idNum: string;
  carrier: string | null;
  phone: string;
  phoneVerified: boolean;
  // 3. account
  userId: string;
  password: string;
  // 4. nickname
  nickname: string;
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
  userId: "",
  password: "",
  nickname: "",
  interests: [],
  customInterest: "",
};

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
