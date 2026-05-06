import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeviceFrame } from "@/shared/components/device-frame";
import { TabLayout } from "@/shared/components/tab-layout";
import { ScreenPlaceholder } from "@/shared/components/screen-placeholder";
import { SplashScreen } from "@/features/splash/splash-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { TermsScreen } from "@/features/signup/terms-screen";
import { VerificationScreen } from "@/features/signup/verification-screen";
import { NicknameScreen } from "@/features/signup/nickname-screen";
import { InterestScreen } from "@/features/signup/interest-screen";
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

          {/* #3~#7 Signup flow */}
          <Route path="/signup/terms" element={<TermsScreen />} />
          <Route path="/signup/verify" element={<VerificationScreen />} />
          <Route path="/signup/nickname" element={<NicknameScreen />} />
          <Route path="/signup/interest" element={<InterestScreen />} />
          <Route path="/signup/room" element={<RoomScreen />} />

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
              <TabLayout>
                <ScreenPlaceholder routeNumber="#9_2" name="마이룸 / 가구 상점" />
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
                <ScreenPlaceholder routeNumber="#13_1" name="마이페이지 메인" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/edit"
            element={<ScreenPlaceholder routeNumber="#13_2" name="프로필 편집" />}
          />
          <Route
            path="/mypage/points"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_3" name="포인트" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/likes"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_5" name="좋아요" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/activity"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_7" name="내 활동" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/posts"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_8" name="내가 쓴 글" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/comments"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_9" name="내가 쓴 댓글" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/friends"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#13_10" name="내 친구" />
              </TabLayout>
            }
          />
          <Route
            path="/mypage/friends/add"
            element={<ScreenPlaceholder routeNumber="#13_13" name="친구 추가" />}
          />

          {/* Catch-all → splash */}
          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </DeviceFrame>
    </BrowserRouter>
  </React.StrictMode>,
);
