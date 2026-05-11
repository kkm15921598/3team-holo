import { useCallback, useState } from "react";

/**
 * 비밀번호 input에서 Caps Lock이 켜져 있는지 감지.
 *
 * 사용 방법:
 *   const { capsOn, capsHandlers } = useCapsLock();
 *
 *   <input
 *     type="password"
 *     {...capsHandlers}
 *     onBlur={(e) => {
 *       capsHandlers.onBlur();
 *       // ... 추가 onBlur 동작
 *     }}
 *   />
 *   {capsOn && <CapsLockBadge />}
 *
 * - 키 누를 때 e.getModifierState("CapsLock")로 즉시 감지
 * - input이 blur 되면 자동으로 false로 리셋 (다른 입력칸으로 이동 시 안내 사라짐)
 */
export function useCapsLock() {
  const [capsOn, setCapsOn] = useState(false);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsOn(e.getModifierState("CapsLock"));
  }, []);

  const onBlur = useCallback(() => {
    setCapsOn(false);
  }, []);

  return {
    capsOn,
    capsHandlers: {
      onKeyDown: onKey,
      onKeyUp: onKey,
      onBlur,
    },
  };
}
