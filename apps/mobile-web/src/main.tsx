import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { DeviceFrame } from "@/shared/components/device-frame";
import { TabLayout } from "@/shared/components/tab-layout";
import { SignupProvider } from "@/shared/contexts/signup-context";
import { SplashScreen } from "@/features/splash/splash-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { FindIdScreen } from "@/features/auth/find-id-screen";
import { FindPasswordScreen } from "@/features/auth/find-password-screen";
import { TermsScreen } from "@/features/signup/terms-screen";
import { VerificationScreen } from "@/features/signup/verification-screen";
import { NicknameScreen } from "@/features/signup/nickname-screen";
import { InterestScreen } from "@/features/signup/interest-screen";
import { ReviewScreen } from "@/features/signup/review-screen";
import { RoomScreen } from "@/features/signup/room-screen";
import { HomeScreen } from "@/features/home/home-screen";
import { AccountScreen } from "@/features/signup/account-screen";
import { MapScreen } from "@/features/map/map-screen";
import { BoardMainScreen } from "@/features/board/board-main-screen";
import { BoardListScreen } from "@/features/board/board-list-screen";
import { BoardDetailScreen } from "@/features/board/board-detail-screen";
import { BoardSearchScreen } from "@/features/board/board-search-screen";
import { BoardWriteScreen } from "@/features/board/board-write-screen";
import { AttendanceScreen } from "@/features/event/attendance-screen";
import { ChatListScreen } from "@/features/chat/chat-list-screen";
import { ChatRoomScreen } from "@/features/chat/chat-room-screen";
import { ProfileDetailScreen } from "@/features/profile/profile-detail-screen";
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
import { QuietHoursScreen } from "@/features/mypage/quiet-hours-screen";
import { ModeScreen } from "@/features/mypage/mode-screen";
import { FreePointsScreen } from "@/features/mypage/free-points-screen";
import { VerifyRegionScreen } from "@/features/mypage/verify-region-screen";
import { MyroomScreen } from "@/features/myroom/myroom-screen";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeviceFrame>
        <Routes>
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<SplashScreen />} />

          <Route path="/login" element={<LoginScreen />} />
          <Route path="/auth/find-id" element={<FindIdScreen />} />
          <Route path="/auth/find-password" element={<FindPasswordScreen />} />

          {/* #3~#7 Signup flow */}
          <Route path="/signup/terms" element={<TermsScreen />} />
          <Route path="/signup/verify" element={<VerificationScreen />} />
          <Route path="/signup/nickname" element={<NicknameScreen />} />
          <Route path="/signup/interest" element={<InterestScreen />} />
          <Route path="/signup/room" element={<RoomScreen />} />
          <Route element={<SignupProvider><Outlet /></SignupProvider>}>
            <Route path="/signup/terms" element={<TermsScreen />} />
            <Route path="/signup/verify" element={<VerificationScreen />} />
            <Route path="/signup/account" element={<AccountScreen />} />
            <Route path="/signup/nickname" element={<NicknameScreen />} />
            <Route path="/signup/interest" element={<InterestScreen />} />
            <Route path="/signup/review" element={<ReviewScreen />} />
            <Route path="/signup/room" element={<RoomScreen />} />
          </Route>

          <Route path="/event/attendance" element={<AttendanceScreen />} />

          <Route path="/home" element={<TabLayout><HomeScreen /></TabLayout>} />
          <Route path="/myroom" element={<TabLayout showHeader={false}><MyroomScreen /></TabLayout>} />
          <Route path="/map" element={<TabLayout><MapScreen /></TabLayout>} />

          <Route path="/board" element={<TabLayout><BoardMainScreen /></TabLayout>} />
          <Route path="/board/list" element={<TabLayout><BoardListScreen /></TabLayout>} />
          <Route path="/board/search" element={<TabLayout><BoardSearchScreen /></TabLayout>} />
          <Route path="/board/write" element={<BoardWriteScreen />} />
          <Route path="/board/:id" element={<TabLayout><BoardDetailScreen /></TabLayout>} />

          <Route path="/chat" element={<TabLayout><ChatListScreen /></TabLayout>} />
          <Route path="/chat/:id" element={<TabLayout showHeader={false}><ChatRoomScreen /></TabLayout>} />
          <Route path="/profile/:id" element={<ProfileDetailScreen />} />

          <Route path="/mypage" element={<TabLayout><MypageScreen /></TabLayout>} />
          <Route path="/mypage/edit" element={<ProfileEditScreen />} />
          <Route
            path="/mypage/points"
            element={
              <TabLayout showHeader={false}>
                <PointsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/points/free"
            element={
              <TabLayout showHeader={false}>
                <FreePointsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/verify-region"
            element={
              <TabLayout showHeader={false}>
                <VerifyRegionScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/likes"
            element={
              <TabLayout showHeader={false}>
                <LikesScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/activity"
            element={
              <TabLayout showHeader={false}>
                <ActivityScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/posts"
            element={
              <TabLayout showHeader={false}>
                <MyPostsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/comments"
            element={
              <TabLayout showHeader={false}>
                <MyCommentsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/recent"
            element={
              <TabLayout showHeader={false}>
                <RecentPostsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/friends"
            element={
              <TabLayout showHeader={false}>
                <FriendsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/friends/add"
            element={
              <TabLayout showHeader={false}>
                <div className="relative flex flex-1 flex-col">
                  <FriendsScreen />
                  <FriendsAddScreen />
                </div>
              </TabLayout>
            }
          />

          {/* #13 Mypage – Settings */}
          <Route
            path="/mypage/account"
            element={
              <TabLayout showHeader={false}>
                <MypageAccountScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/account/link"
            element={
              <TabLayout showHeader={false}>
                <AccountLinkScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/account/password"
            element={
              <TabLayout showHeader={false}>
                <PasswordChangeScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/account/phone"
            element={
              <TabLayout showHeader={false}>
                <PhoneChangeScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/account/email"
            element={
              <TabLayout showHeader={false}>
                <EmailChangeScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/account/history"
            element={
              <TabLayout showHeader={false}>
                <LoginHistoryScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/privacy"
            element={
              <TabLayout showHeader={false}>
                <PrivacyScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/privacy/policy"
            element={
              <TabLayout showHeader={false}>
                <PrivacyPolicyScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/privacy/terms"
            element={
              <TabLayout showHeader={false}>
                <TermsOfServiceScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/privacy/data"
            element={
              <TabLayout showHeader={false}>
                <DataDownloadScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/notifications"
            element={
              <TabLayout showHeader={false}>
                <NotificationsScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/notifications/quiet"
            element={
              <TabLayout showHeader={false}>
                <QuietHoursScreen />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/mode"
            element={
              <TabLayout showHeader={false}>
                <ModeScreen />
              </TabLayout>
            }
          />
          <Route path="/mypage/points" element={<TabLayout showHeader={false}><PointsScreen /></TabLayout>} />
          <Route path="/mypage/likes" element={<TabLayout showHeader={false}><LikesScreen /></TabLayout>} />
          <Route path="/mypage/activity" element={<TabLayout showHeader={false}><ActivityScreen /></TabLayout>} />
          <Route path="/mypage/posts" element={<TabLayout showHeader={false}><MyPostsScreen /></TabLayout>} />
          <Route path="/mypage/comments" element={<TabLayout showHeader={false}><MyCommentsScreen /></TabLayout>} />
          <Route path="/mypage/friends" element={<TabLayout showHeader={false}><FriendsScreen /></TabLayout>} />
          <Route path="/mypage/friends/add" element={<FriendsAddScreen />} />

          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </DeviceFrame>
    </BrowserRouter>
  </React.StrictMode>,
);
