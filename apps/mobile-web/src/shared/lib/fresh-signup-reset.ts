/**
 * 신규 가입 완료 시점에 호출되는 store 초기화 헬퍼.
 *
 * 이전에 테스트 계정으로 로그인해 있었거나 데모 데이터가 localStorage 에 쌓여
 * 있더라도, 가입을 마치면 깨끗한 상태에서 시작하도록 모든 사용자 store 를 비운다.
 *
 * 가입 보상(뱃지 / 칭호 / 포인트 / 마이룸 가구) 은 이 함수가 호출된 뒤
 * 발급되어야 한다 (순서 중요). 그래야 보상이 리셋에 의해 지워지지 않는다.
 */
import { resetStats } from "@/shared/stores/account-stats-store";
import { setLikedIds } from "@/shared/stores/likes-store";
import { setJoinedIds } from "@/shared/stores/joined-store";
import { setViewedIds } from "@/shared/stores/viewed-posts-store";
import { setComments } from "@/shared/stores/comments-store";
import { resetXp } from "@/shared/stores/xp-store";
import { resetFriendsStore } from "@/features/mypage/friends-store";
import { clearAllDynNotifications } from "@/shared/stores/notifications-store";
import { resetMyroomStore } from "@/features/myroom/myroom-store";
import { postsStore } from "@/features/board/posts-store";
import { draftsStore } from "@/features/board/drafts-store";
import { resetRoomsStore } from "@/features/chat/rooms-store";
import { clearAllMessages } from "@/features/chat/messages-store";
import { resetKickedMembers } from "@/features/chat/kicked-members-store";

/**
 * 신규 가입한 사용자가 깨끗한 시작점에서 출발하도록 모든 store 리셋.
 * 가입 직후 호출하고, 그 다음에 가입 보상(뱃지/칭호/포인트/마이룸 가구) 발급.
 */
export function resetAllStoresForFreshSignup(): void {
  // 통계 — 레벨 1, 뱃지/칭호는 DEFAULT_STATS 의 가입 기본값([badge_24]/[#홀로_입주자])
  resetStats();
  // 활동 store — 모두 비움
  setLikedIds([]);
  setJoinedIds([]);
  setViewedIds([]);
  setComments([]);
  resetXp();
  // 친구 / 친구 요청 / 차단 / 친구 알림
  resetFriendsStore();
  clearAllDynNotifications();
  // 마이룸 — 가구 / 소유 / 포인트 / 이용내역 / 상태 / 일일 cap
  resetMyroomStore();
  // 게시글 / 임시저장 — 테스트 계정이 prepend 한 글 제거
  postsStore.resetToInitial();
  draftsStore.clearAll();
  // 채팅 — 시드 CHATROOMS 만 남기고, 모든 메시지 캐시 비움
  resetRoomsStore();
  clearAllMessages();
  // 모임 강퇴 기록 초기화
  resetKickedMembers();
}
