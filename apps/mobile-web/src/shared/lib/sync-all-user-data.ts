/**
 * 로그인 직후 호출 — Supabase users 테이블(+관련 테이블)에 저장된
 * 모든 사용자 데이터를 로컬 store 로 복원한다.
 *
 * 배경: 각 store 는 window "load" 이벤트에서 한 번 sync 하지만,
 * 인앱 로그인은 페이지 리로드가 없어 그 sync 가 다시 실행되지 않는다.
 * 그 결과 재로그인 시 프로필 사진/칭호/마이룸 가구/포인트/레벨 등이
 * 기본값으로 남는 문제가 있었다. 로그인 성공 시 이 함수를 직접 호출해
 * Supabase(=source of truth)에서 즉시 전부 복원한다.
 *
 * 주의: 호출 전에 setCurrentAccount(phone) 로 현재 계정을 확정하고,
 * "holo:fresh-signup" skip 플래그를 제거해야 한다(로그인은 신규가입이 아니므로).
 */
import { syncProfileFromSupabase } from "@/shared/stores/profile-store";
import { syncStatsFromSupabase } from "@/shared/stores/account-stats-store";
import { syncXpFromSupabase } from "@/shared/stores/xp-store";
import { syncVerificationFromSupabase } from "@/shared/stores/verification-store";
import { syncActivityFromSupabase } from "@/shared/stores/activity-store";
import { syncLikesFromSupabase } from "@/shared/stores/likes-store";
import { syncJoinedFromSupabase } from "@/shared/stores/joined-store";
import { syncViewedPostsFromSupabase } from "@/shared/stores/viewed-posts-store";
import { syncReportedUsersFromSupabase } from "@/shared/stores/reported-users-store";
import { syncBlockedFromSupabase } from "@/shared/stores/blocked-nicknames-store";
import { syncBumpsFromSupabase } from "@/shared/stores/bump-store";
import { syncPrivacyFromSupabase } from "@/shared/stores/privacy-store";
import { syncNotificationSettingsFromSupabase } from "@/shared/stores/notification-settings-store";
import { syncMyroomFromSupabase } from "@/features/myroom/myroom-store";
import { syncRoomsFromSupabase } from "@/features/chat/rooms-store";
import {
  syncFriendsFromSupabase,
  syncFriendRequestsFromSupabase,
} from "@/features/mypage/friends-store";

/**
 * 모든 사용자 store 를 Supabase 에서 복원. 일부가 실패해도 나머지는 계속 진행.
 * (각 sync 는 내부적으로 best-effort 이며 실패 시 콘솔 경고만 남긴다)
 */
export async function syncAllUserDataFromSupabase(): Promise<void> {
  await Promise.allSettled([
    syncProfileFromSupabase(),
    syncStatsFromSupabase(),
    syncXpFromSupabase(),
    syncVerificationFromSupabase(),
    syncActivityFromSupabase(),
    syncLikesFromSupabase(),
    syncJoinedFromSupabase(),
    syncViewedPostsFromSupabase(),
    syncReportedUsersFromSupabase(),
    syncBlockedFromSupabase(),
    syncBumpsFromSupabase(),
    syncPrivacyFromSupabase(),
    syncNotificationSettingsFromSupabase(),
    syncMyroomFromSupabase(),
    syncRoomsFromSupabase(),
    syncFriendsFromSupabase(),
    syncFriendRequestsFromSupabase(),
  ]);
}
