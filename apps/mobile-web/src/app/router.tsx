import { Navigate, Route, Routes } from "react-router-dom";
import { LoginScreen } from "@/features/auth/components/login-screen";
import { SignupAddressScreen } from "@/features/auth/components/signup-address-screen";
import { SignupDoneScreen } from "@/features/auth/components/signup-done-screen";
import { SignupGuard } from "@/features/auth/components/signup-guard";
import { SignupIdentityScreen } from "@/features/auth/components/signup-identity-screen";
import { SignupLayout } from "@/features/auth/components/signup-layout";
import { SignupNicknameScreen } from "@/features/auth/components/signup-nickname-screen";
import { SignupPhoneScreen } from "@/features/auth/components/signup-phone-screen";
import { SignupTermsScreen } from "@/features/auth/components/signup-terms-screen";
import { BoardDetailPlaceholder } from "@/features/board/components/board-detail-placeholder";
import { BoardScreen } from "@/features/board/components/board-screen";
import { ChatRoomPlaceholder } from "@/features/chat/components/chat-room-placeholder";
import { ChatScreen } from "@/features/chat/components/chat-screen";
import { HomeScreen } from "@/features/home/components/home-screen";
import { MapScreen } from "@/features/map/components/map-screen";
import { MyRoomPlaceholder } from "@/features/myroom/components/myroom-placeholder";
import { CheckinScreen } from "@/features/profile/components/checkin-screen";
import { FriendsScreen } from "@/features/profile/components/friends-screen";
import { ProfileScreen } from "@/features/profile/components/profile-screen";
import { QrScreen } from "@/features/profile/components/qr-screen";
import { ProtectedRoute } from "@/shared/auth/protected-route";
import { FullLayout } from "@/shared/components/full-layout";
import { TabLayout } from "@/shared/components/tab-layout";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />

      <Route path="/signup" element={<SignupGuard />}>
        <Route element={<SignupLayout />}>
          <Route index element={<Navigate to="terms" replace />} />
          <Route path="terms" element={<SignupTermsScreen />} />
          <Route path="identity" element={<SignupIdentityScreen />} />
          <Route path="phone" element={<SignupPhoneScreen />} />
          <Route path="address" element={<SignupAddressScreen />} />
          <Route path="nickname" element={<SignupNicknameScreen />} />
          <Route path="done" element={<SignupDoneScreen />} />
        </Route>
      </Route>

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
          <Route path="/me/friends" element={<FriendsScreen />} />
          <Route path="/me/checkin" element={<CheckinScreen />} />
          <Route path="/me/qr" element={<QrScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
