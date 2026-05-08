import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 인증번호 타이머용 카운트다운 훅.
 *
 * - `active`가 true가 되는 순간 `seconds`초로 리셋되고 매 초 감소합니다.
 * - 0이 되면 자동으로 멈춥니다.
 * - `restart()`를 호출하면 다시 `seconds`초부터 시작합니다.
 *
 * 사용 예:
 *   const { remaining, formatted, expired, restart } = useCountdown(180, codeSent);
 */
export function useCountdown(seconds: number, active: boolean) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds, clear]);

  // active가 true로 바뀔 때 시작, false면 정지.
  useEffect(() => {
    if (active) {
      start();
    } else {
      clear();
      setRemaining(seconds);
    }
    return clear;
    // active 토글에 반응. seconds 변경 시 재시작은 의도적으로 무시.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const restart = useCallback(() => {
    if (active) start();
  }, [active, start]);

  return {
    remaining,
    formatted: formatMMSS(remaining),
    expired: remaining === 0,
    restart,
  };
}

function formatMMSS(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
