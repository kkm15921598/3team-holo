import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DeviceFrame } from "@/shared/components/device-frame";
import { TabLayout } from "@/shared/components/tab-layout";
import { ScreenPlaceholder } from "@/shared/components/screen-placeholder";
import { SplashScreen } from "@/features/splash/splash-screen";
import { LoginScreen } from "@/features/auth/login-screen";
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
          <Route path="/signup/terms" element={<ScreenPlaceholder routeNumber="#3" name="약관 동의" />} />
          <Route path="/signup/verify" element={<ScreenPlaceholder routeNumber="#4" name="본인 인증" />} />
          <Route path="/signup/nickname" element={<ScreenPlaceholder routeNumber="#5" name="닉네임 설정" />} />
          <Route path="/signup/interest" element={<ScreenPlaceholder routeNumber="#6" name="관심사 선택" />} />
          <Route path="/signup/room" element={<ScreenPlaceholder routeNumber="#7" name="마이룸 꾸미기 (온보딩)" />} />

          {/* #8 Event */}
          <Route
            path="/event/attendance"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#8" name="출석체크" />
              </TabLayout>
            }
          />

          {/* #9 Home */}
          <Route
            path="/home"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#9" name="메인 홈" />
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
                <ScreenPlaceholder routeNumber="#10" name="지도" />
              </TabLayout>
            }
          />

          {/* #11 Board */}
          <Route
            path="/board"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#11_1" name="게시판 메인" />
              </TabLayout>
            }
          />
          <Route
            path="/board/list"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#11_2" name="게시판 목록" />
              </TabLayout>
            }
          />
          <Route
            path="/board/search"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#11_4" name="게시판 검색/필터" />
              </TabLayout>
            }
          />
          <Route
            path="/board/write"
            element={<ScreenPlaceholder routeNumber="#11_5" name="게시글 작성" />}
          />
          <Route
            path="/board/:id"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#11_3" name="게시글 상세" />
              </TabLayout>
            }
          />

          {/* #12 Chat */}
          <Route
            path="/chat"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#12_2" name="채팅방 목록" />
              </TabLayout>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <TabLayout>
                <ScreenPlaceholder routeNumber="#12_1" name="채팅방 대화" />
              </TabLayout>
            }
          />
          <Route
            path="/profile/:id"
            element={<ScreenPlaceholder routeNumber="#12_5" name="타사용자 프로필" />}
          />

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
