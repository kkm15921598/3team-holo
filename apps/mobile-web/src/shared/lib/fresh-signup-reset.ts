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
import { resetVerification } from "@/shared/stores/verification-store";
import { resetActivityStore } from "@/shared/stores/activity-store";
import { resetBlockedNicknames } from "@/shared/stores/blocked-nicknames-store";
import { resetReportedUsers } from "@/shared/stores/reported-users-store";
import { bumpStore } from "@/shared/stores/bump-store";
import { resetNotificationSettings } from "@/shared/stores/notification-settings-store";
import { privacyStore } from "@/shared/stores/privacy-store";
import { resetQuietHours } from "@/features/mypage/quiet-hours-store";

/**
 * 신규 가입한 사용자가 깨끗한 시작점에서 출발하도록 모든 store 리셋.
 * 가입 직후 호출하고, 그 다음에 가입 보상(뱃지/칭호/포인트/마이룸 가구) 발급.
 *
 * = 사용자별 store 전부(resetUserStoresForLogin) + 전역/공개 목록(글/임시저장/채팅).
 * 사용자별 리셋 목록은 resetUserStoresForLogin 한 곳에서만 관리한다(중복/누락 방지).
 */
export function resetAllStoresForFreshSignup(): void {
  // 사용자별 store 전부 비움 — 통계/XP/좋아요/참여/조회/댓글/차단/신고/끌어올리기/
  // 마이룸/인증/활동/친구/동적알림/강퇴. (단일 출처 = resetUserStoresForLogin)
  resetUserStoresForLogin();
  // 전역/공개 목록 — 신규 가입에서만 추가로 비운다(테스트 계정이 prepend 한 글 등 제거).
  postsStore.resetToInitial();
  draftsStore.clearAll();
  // 채팅 — 시드 CHATROOMS 만 남기고, 모든 메시지 캐시 비움
  resetRoomsStore();
  clearAllMessages();
}

/**
 * 로그인 직후(다른 계정으로 전환 포함) 호출 — 이전 계정의 "사용자별" 데이터를 비운다.
 *
 * 배경: 로그아웃은 localStorage 를 비우지 않고, 인앱 로그인은 페이지 리로드가 없다.
 * 게다가 각 store 의 syncFromSupabase 는 대부분 '병합'(union/Math.max)이거나 빈/0 값을
 * 건너뛰므로, 비우지 않고 sync 하면 이전 계정의 좋아요/참여/차단/신고/끌어올리기/XP/
 * 포인트/가구/인증 등이 새 계정에 남아 노출·오염된다.
 * → sync 전에 사용자별 store 를 기본값으로 비우면, 비어있는 로컬 + 원격 병합 = 정확히
 *   현재 계정의 데이터가 된다.
 *
 * 주의: posts/rooms/drafts 같은 "전역/공개" 목록은 SPA 에서 재로딩되지 않으므로 건드리지 않는다
 * (게시판이 빈 화면이 되는 회귀 방지). 이들은 계정별 데이터가 아니라 누설 위험도 없다.
 */
export function resetUserStoresForLogin(): void {
  resetStats();
  resetXp();
  setLikedIds([]);
  setJoinedIds([]);
  setViewedIds([]);
  setComments([]);
  resetBlockedNicknames();
  resetReportedUsers();
  bumpStore.reset();
  resetMyroomStore();
  resetVerification();
  resetActivityStore();
  resetFriendsStore();
  clearAllDynNotifications();
  resetKickedMembers();
  // 알림설정(ON/OFF·읽음목록)·개인정보(위치공유/친구요청허용/마케팅)도 비운다 —
  // 둘 다 sync 가 원격 누락 시 건너뛰므로, reset 이 없으면 이전 계정 값이 새 계정에 누설된다.
  resetNotificationSettings();
  privacyStore.reset();
  resetQuietHours();
}
