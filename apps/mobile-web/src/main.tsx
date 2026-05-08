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
import { AccountScreen } from "@/features/signup/account-screen";
import { NicknameScreen } from "@/features/signup/nickname-screen";
import { InterestScreen } from "@/features/signup/interest-screen";
import { ReviewScreen } from "@/features/signup/review-screen";
import { RoomScreen } from "@/features/signup/room-screen";
import { HomeScreen } from "@/features/home/home-screen";
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
import { FriendsScreen } from "@/features/mypage/friends-screen";
import { FriendsAddScreen } from "@/features/mypage/friends-add-screen";
import { MyroomScreen } from "@/features/myroom/myroom-screen";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DeviceFrame>
        <Routes>
          {/* Entry */}
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<SplashScreen />} />

          {/* #2 Auth */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/auth/find-id" element={<FindIdScreen />} />
          <Route path="/auth/find-password" element={<FindPasswordScreen />} />

          {/*
            #3~#7 Signup flow
            전체를 SignupProvider로 감싸서 단계 간 입력값이 보존되게 함.
            가입 라우트 사이를 이동해도 Provider가 살아있고, 다른 라우트(/login 등)로
            나가면 Provider가 unmount되어 데이터가 초기화됨.
          */}
          <Route element={<SignupProvider><Outlet /></SignupProvider>}>
            <Route path="/signup/terms" element={<TermsScreen />} />
            <Route path="/signup/verify" element={<VerificationScreen />} />
            <Route path="/signup/account" element={<AccountScreen />} />
            <Route path="/signup/nickname" element={<NicknameScreen />} />
            <Route path="/signup/interest" element={<InterestScreen />} />
            <Route path="/signup/review" element={<ReviewScreen />} />
            <Route path="/signup/room" element={<RoomScreen />} />
          </Route>

          {/* #8 Event */}
          <Route path="/event/attendance" element={<AttendanceScreen />} />

          {/* #9 Home */}
          <Route
            path="/home"
            element={
              <TabLayout>
                <HomeScreen />
              </TabLayout>
            }
          />

          {/* #9_2 Room shop (가구 상점) */}
          <Route
            path="/myroom"
            element={
              <TabLayout showHeader={false}>
                <MyroomScreen />
              </TabLayout>
            }
          />

          {/* #10 Map */}
          <Route
            path="/map"
            element={
              <TabLayout>
                <MapScreen />
              </TabLayout>
            }
          />

          {/* #11 Board */}
          <Route
            path="/board"
            element={
              <TabLayout>
                <BoardMainScreen />
              </TabLayout>
            }
          />
          <Route
            path="/board/list"
            element={
              <TabLayout>
                <BoardListScreen />
              </TabLayout>
            }
          />
          <Route
            path="/board/search"
            element={
              <TabLayout>
                <BoardSearchScreen />
              </TabLayout>
            }
          />
          <Route path="/board/write" element={<BoardWriteScreen />} />
          <Route
            path="/board/:id"
            element={
              <TabLayout>
                <BoardDetailScreen />
              </TabLayout>
            }
          />

          {/* #12 Chat */}
          <Route
            path="/chat"
            element={
              <TabLayout>
                <ChatListScreen />
              </TabLayout>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <TabLayout showHeader={false}>
                <ChatRoomScreen />
              </TabLayout>
            }
          />
          <Route path="/profile/:id" element={<ProfileDetailScreen />} />

          {/* #13 Mypage */}
          <Route
            path="/mypage"
            element={
              <TabLayout>
                <MypageScreen />
              </TabLayout>
            }
          />
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
            path="/mypage/friends"
            element={
              <TabLayout showHeader={false}>
                <FriendsScreen />
              </TabLayout>
            }
          />
          <Route path="/mypage/friends/add" element={<FriendsAddScreen />} />

          {/* Catch-all → splash */}
          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </DeviceFrame>
    </BrowserRouter>
  </React.StrictMode>,
);
