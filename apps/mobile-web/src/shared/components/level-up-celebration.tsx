import {
  clearPendingLevelUp,
  usePendingLevelUp,
} from "@/shared/stores/xp-store";
import { ConfirmModal } from "./confirm-modal";

/**
 * 레벨업 직후 한 번 노출되는 축하 모달.
 *
 * - xp-store 의 `pendingLevelUp` 을 구독해서, 값이 있으면 모달이 떠 있고 확인 누르면 비움.
 * - 한 액션으로 여러 레벨 점프하면 toLevel 까지의 메시지로 노출.
 * - 앱 어디서 XP 가 적립되든 즉시 보이도록 최상위 트리에 한 번만 mount 하면 됨.
 */
export function LevelUpCelebration() {
  const pending = usePendingLevelUp();
  const open = pending !== null;
  return (
    <ConfirmModal
      open={open}
      message={
        pending ? (
          <>
            <span className="mr-1">🎉</span>
            레벨 <span className="text-holo-purple-mid">{pending.toLevel}</span>
            <span> 달성!</span>
          </>
        ) : (
          ""
        )
      }
      description={
        pending
          ? pending.toLevel - pending.fromLevel > 1
            ? `한 번에 ${pending.toLevel - pending.fromLevel}단계 상승했어요. 새로운 혜택을 확인해보세요!`
            : "다음 단계로 한 발 더 나아갔어요. 계속 활동해보세요!"
          : ""
      }
      confirmLabel="확인"
      singleAction
      onConfirm={clearPendingLevelUp}
    />
  );
}
