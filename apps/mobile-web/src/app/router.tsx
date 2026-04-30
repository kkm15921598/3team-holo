import { Navigate, Route, Routes } from "react-router-dom";
import { LoginScreen } from "@/features/auth/components/login-screen";
import { BoardDetailPlaceholder } from "@/features/board/components/board-detail-placeholder";
import { BoardScreen } from "@/features/board/components/board-screen";
import { ChatRoomPlaceholder } from "@/features/chat/components/chat-room-placeholder";
import { ChatScreen } from "@/features/chat/components/chat-screen";
import { HomeScreen } from "@/features/home/components/home-screen";
import { MapScreen } from "@/features/map/components/map-screen";
import { MyRoomPlaceholder } from "@/features/myroom/components/myroom-placeholder";
import { ProfileScreen } from "@/features/profile/components/profile-screen";
import { ProtectedRoute } from "@/shared/auth/protected-route";
import { FullLayout } from "@/shared/components/full-layout";
import { TabLayout } from "@/shared/components/tab-layout";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<TabLayout />}>
          <Route index element={<HomeScreen />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/board" element={<BoardScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/me" element={<ProfileScreen />} />
        </Route>

        <Route element={<FullLayout />}>
          <Route path="/board/:id" element={<BoardDetailPlaceholder />} />
          <Route path="/chat/:id" element={<ChatRoomPlaceholder />} />
          <Route path="/myroom" element={<MyRoomPlaceholder />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
