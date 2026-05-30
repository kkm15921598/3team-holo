import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { DeviceFrame } from "@/shared/components/device-frame";
import { LevelUpCelebration } from "@/shared/components/level-up-celebration";
import { TabLayout } from "@/shared/components/tab-layout";
import { SignupProvider } from "@/shared/contexts/signup-context";
import { ErrorBoundary } from "@/shared/components/error-boundary";

// Screens
import { SplashScreen } from "@/features/splash/splash-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { FindIdScreen } from "@/features/auth/find-id-screen";
import { FindPasswordScreen } from "@/features/auth/find-password-screen";

// Signup flow Screens
import { TermsScreen } from "@/features/signup/terms-screen";
import { VerificationScreen } from "@/features/signup/verification-screen";
import { AccountScreen } from "@/features/signup/account-screen"; // ✅ 에러의 원인이었던 누락된 임포트 추가
import { NicknameScreen } from "@/features/signup/nickname-screen";
import { InterestScreen } from "@/features/signup/interest-screen";
import { ReviewScreen } from "@/features/signup/review-screen";
import { RoomScreen } from "@/features/signup/room-screen";

// Home & Map
import { HomeScreen } from "@/features/home/home-screen";
import { MapScreen } from "@/features/map/map-screen";

// Board
import { BoardMainScreen } from "@/features/board/board-main-screen";
import { BoardListScreen } from "@/features/board/board-list-screen";
import { BoardDetailScreen } from "@/features/board/board-detail-screen";
import { BoardSearchScreen } from "@/features/board/board-search-screen";
import { BoardWriteScreen } from "@/features/board/board-write-screen";
import { BoardDraftsScreen } from "@/features/board/board-drafts-screen";

// Chat & Profile
import { AttendanceScreen } from "@/features/event/attendance-screen";
import { ChatListScreen } from "@/features/chat/chat-list-screen";
import { ChatRoomScreen } from "@/features/chat/chat-room-screen";
import { ProfileDetailScreen } from "@/features/profile/profile-detail-screen";
import { FriendPostsScreen } from "@/features/profile/friend-posts-screen";
import { FriendCommentsScreen } from "@/features/profile/friend-comments-screen";

// Mypage & Settings
import { MypageScreen } from "@/features/mypage/mypage-screen";
import { ProfileEditScreen } from "@/features/mypage/profile-edit-screen";
import { PointsScreen } from "@/features/mypage/points-screen";
import { LikesScreen } from "@/features/mypage/likes-screen";
import { ActivityScreen } from "@/features/mypage/activity-screen";
import { MyPostsScreen } from "@/features/mypage/my-posts-screen";
import { MyCommentsScreen } from "@/features/mypage/my-comments-screen";
import { RecentPostsScreen } from "@/features/mypage/recent-posts-screen";
import { FriendsScreen } from "@/features/mypage/friends-screen";
import { FriendsAddScreen } from "@/features/mypage/friends-add-screen";
import { FriendRequestsScreen } from "@/features/mypage/friend-requests-screen";
import { NeighborhoodFindScreen } from "@/features/mypage/neighborhood-find-screen";
import { NotificationsListScreen } from "@/features/notifications/notifications-list-screen";
import { AccountScreen as MypageAccountScreen } from "@/features/mypage/account-screen";
import { AccountLinkScreen } from "@/features/mypage/account-link-screen";
import { PasswordChangeScreen } from "@/features/mypage/password-change-screen";
import { PhoneChangeScreen } from "@/features/mypage/phone-change-screen";
import { EmailChangeScreen } from "@/features/mypage/email-change-screen";
import { LoginHistoryScreen } from "@/features/mypage/login-history-screen";
import { PrivacyScreen } from "@/features/mypage/privacy-screen";
import { PrivacyPolicyScreen } from "@/features/mypage/privacy-policy-screen";
import { TermsOfServiceScreen } from "@/features/mypage/terms-of-service-screen";
import { DataDownloadScreen } from "@/features/mypage/data-download-screen";
import { NotificationsScreen } from "@/features/mypage/notifications-screen";
import { HelpScreen } from "@/features/mypage/help-screen";
import { QuietHoursScreen } from "@/features/mypage/quiet-hours-screen";
import { ModeScreen } from "@/features/mypage/mode-screen";
import { FreePointsScreen } from "@/features/mypage/free-points-screen";
import { VerifyRegionScreen } from "@/features/mypage/verify-region-screen";
import { MyLevelScreen } from "@/features/mypage/my-level-screen";
import { MyBadgesScreen } from "@/features/mypage/my-badges-screen";
import { MyTitlesScreen } from "@/features/mypage/my-titles-screen";
import { MyMeetingsScreen } from "@/features/mypage/my-meetings-screen";
import { MyroomScreen } from "@/features/myroom/myroom-screen";

import { markActiveToday } from "@/shared/stores/activity-store";
import { pruneNonMeetupRooms } from "@/features/board/meetup-utils";
import { evaluateAchievements } from "@/shared/lib/achievements";

import "./index.css";

// 앱 진입 시 오늘 날짜를 접속일 set 에 기록 — 가입일 이후 실제 사용한 고유 일 수 카운트용
markActiveToday();

// 자유 / 추천 단순 게시글에 잘못 연결된 모임 채팅방(localStorage 잔존)을 정리.
// 시드 데이터 변경 / 옛 빌드의 잔재로 남은 "meetup-<자유글>" 방을 한 번에 제거한다.
pruneNonMeetupRooms();

// 배지/칭호 자동 발급 — 데이터(글/댓글/좋아요/친구/레벨)가 로드된 뒤 한 번 평가.
// (마이페이지/배지/칭호 화면 진입 시에도 재평가하지만, 여기서 한 번 해 알림이 뜨게 함)
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    window.setTimeout(() => evaluateAchievements(), 1200);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <DeviceFrame>
        <Routes>
          {/* Splash & Auth */}
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/auth/find-id" element={<FindIdScreen />} />
          <Route path="/auth/find-password" element={<FindPasswordScreen />} />

          {/* ✅ Signup flow (SignupProvider로 감싸서 데이터 유지) */}
          <Route element={<SignupProvider><Outlet /></SignupProvider>}>
            <Route path="/signup/terms" element={<TermsScreen />} />
            <Route path="/signup/verify" element={<VerificationScreen />} />
            <Route path="/signup/account" element={<AccountScreen />} />
            <Route path="/signup/nickname" element={<NicknameScreen />} />
            <Route path="/signup/interest" element={<InterestScreen />} />
            <Route path="/signup/review" element={<ReviewScreen />} />
            <Route path="/signup/room" element={<RoomScreen />} />
          </Route>

          {/* Event */}
          <Route
            path="/event/attendance"
            element={
              <TabLayout showHeader={false}>
                <AttendanceScreen />
              </TabLayout>
            }
          />

          {/* Main Tabs */}
          <Route path="/home" element={<TabLayout><HomeScreen /></TabLayout>} />
          <Route path="/myroom" element={<TabLayout showHeader={false}><MyroomScreen /></TabLayout>} />
          <Route path="/map" element={<TabLayout><MapScreen /></TabLayout>} />

          {/* Board */}
          <Route path="/board" element={<TabLayout><BoardMainScreen /></TabLayout>} />
          <Route path="/board/list" element={<TabLayout><BoardListScreen /></TabLayout>} />
          <Route path="/board/search" element={<TabLayout><BoardSearchScreen /></TabLayout>} />
          <Route path="/board/write" element={<TabLayout showHeader={false}><BoardWriteScreen /></TabLayout>} />
          <Route path="/board/drafts" element={<BoardDraftsScreen />} />
          <Route path="/board/:id" element={<TabLayout><BoardDetailScreen /></TabLayout>} />

          {/* Chat & Profile */}
          <Route path="/chat" element={<TabLayout><ChatListScreen /></TabLayout>} />
          <Route path="/chat/:id" element={<TabLayout showHeader={false}><ChatRoomScreen /></TabLayout>} />
          <Route path="/profile/:id" element={<ProfileDetailScreen />} />
          <Route path="/profile/:id/posts" element={<TabLayout showHeader={false}><FriendPostsScreen /></TabLayout>} />
          <Route path="/profile/:id/comments" element={<TabLayout showHeader={false}><FriendCommentsScreen /></TabLayout>} />

          {/* Mypage */}
          <Route path="/mypage" element={<TabLayout><MypageScreen /></TabLayout>} />
          <Route path="/mypage/edit" element={<ProfileEditScreen />} />
          <Route path="/mypage/points" element={<TabLayout showHeader={false}><PointsScreen /></TabLayout>} />
          <Route path="/mypage/points/free" element={<TabLayout showHeader={false}><FreePointsScreen /></TabLayout>} />
          <Route path="/mypage/verify-region" element={<TabLayout showHeader={false}><VerifyRegionScreen /></TabLayout>} />
          <Route path="/mypage/likes" element={<TabLayout showHeader={false}><LikesScreen /></TabLayout>} />
          <Route path="/mypage/activity" element={<TabLayout showHeader={false}><ActivityScreen /></TabLayout>} />
          <Route path="/mypage/posts" element={<TabLayout showHeader={false}><MyPostsScreen /></TabLayout>} />
          <Route path="/mypage/comments" element={<TabLayout showHeader={false}><MyCommentsScreen /></TabLayout>} />
          <Route path="/mypage/recent" element={<TabLayout showHeader={false}><RecentPostsScreen /></TabLayout>} />
          <Route path="/mypage/friends" element={<TabLayout showHeader={false}><FriendsScreen /></TabLayout>} />
          <Route path="/mypage/friends/add" element={<TabLayout showHeader={false}><FriendsAddScreen /></TabLayout>} />
          <Route path="/mypage/friends/requests" element={<TabLayout showHeader={false}><FriendRequestsScreen /></TabLayout>} />
          <Route path="/mypage/neighborhood" element={<TabLayout showHeader={false}><NeighborhoodFindScreen /></TabLayout>} />
          <Route path="/notifications" element={<TabLayout showHeader={false}><NotificationsListScreen /></TabLayout>} />

          {/* Mypage Settings */}
          <Route path="/mypage/account" element={<TabLayout showHeader={false}><MypageAccountScreen /></TabLayout>} />
          <Route path="/mypage/account/link" element={<TabLayout showHeader={false}><AccountLinkScreen /></TabLayout>} />
          <Route path="/mypage/account/password" element={<TabLayout showHeader={false}><PasswordChangeScreen /></TabLayout>} />
          <Route path="/mypage/account/phone" element={<TabLayout showHeader={false}><PhoneChangeScreen /></TabLayout>} />
          <Route path="/mypage/account/email" element={<TabLayout showHeader={false}><EmailChangeScreen /></TabLayout>} />
          <Route path="/mypage/account/history" element={<TabLayout showHeader={false}><LoginHistoryScreen /></TabLayout>} />
          <Route path="/mypage/privacy" element={<TabLayout showHeader={false}><PrivacyScreen /></TabLayout>} />
          <Route path="/mypage/privacy/policy" element={<TabLayout showHeader={false}><PrivacyPolicyScreen /></TabLayout>} />
          <Route path="/mypage/privacy/terms" element={<TabLayout showHeader={false}><TermsOfServiceScreen /></TabLayout>} />
          <Route path="/mypage/privacy/data" element={<TabLayout showHeader={false}><DataDownloadScreen /></TabLayout>} />
          <Route path="/mypage/notifications" element={<TabLayout showHeader={false}><NotificationsScreen /></TabLayout>} />
          <Route path="/mypage/notifications/quiet" element={<TabLayout showHeader={false}><QuietHoursScreen /></TabLayout>} />
          <Route path="/mypage/help" element={<TabLayout showHeader={false}><HelpScreen /></TabLayout>} />
          <Route path="/mypage/mode" element={<TabLayout showHeader={false}><ModeScreen /></TabLayout>} />
          <Route path="/mypage/level" element={<TabLayout showHeader={false}><MyLevelScreen /></TabLayout>} />
          <Route path="/mypage/badges" element={<TabLayout showHeader={false}><MyBadgesScreen /></TabLayout>} />
          <Route path="/mypage/titles" element={<TabLayout showHeader={false}><MyTitlesScreen /></TabLayout>} />
          <Route path="/mypage/meetings" element={<TabLayout showHeader={false}><MyMeetingsScreen /></TabLayout>} />

          {/* 잘못된/오래된 경로는 로그인 화면(splash)으로 튕기지 않고 인앱 홈으로 보낸다. */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        {/* 레벨업 축하 모달 — 어디서 XP 가 적립되어 레벨이 오르든 최상단에서 한 번 노출. */}
        <LevelUpCelebration />
      </DeviceFrame>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
