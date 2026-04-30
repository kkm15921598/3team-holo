import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type SignupState = {
  agreedAge: boolean;
  agreedTos: boolean;
  agreedPrivacy: boolean;
  agreedMarketing: boolean;
  name: string;
  birth: string;
  gender: "male" | "female" | "none" | "";
  phone: string;
  phoneVerified: boolean;
  address: string;
  nickname: string;
  bio: string;
};

const INITIAL: SignupState = {
  agreedAge: false,
  agreedTos: false,
  agreedPrivacy: false,
  agreedMarketing: false,
  name: "",
  birth: "",
  gender: "",
  phone: "",
  phoneVerified: false,
  address: "",
  nickname: "",
  bio: "",
};

type SignupContextValue = {
  state: SignupState;
  patch: (next: Partial<SignupState>) => void;
  reset: () => void;
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupState>(INITIAL);

  const patch = useCallback((next: Partial<SignupState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  const value = useMemo<SignupContextValue>(() => ({ state, patch, reset }), [state, patch, reset]);

  return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup must be used within <SignupProvider>");
  return ctx;
}
