import { Routes, Route, Navigate } from 'react-router-dom';
import { Splash } from './screens/Splash';
import { Login } from './screens/Login';
import { Terms } from './screens/Terms';
import { Verify } from './screens/Verify';
import { Nickname } from './screens/Nickname';
import { Interests } from './screens/Interests';
import { MyRoomOnboarding } from './screens/MyRoomOnboarding';
import { Attendance } from './screens/Attendance';
import { Home } from './screens/Home';
import { MyRoom } from './screens/MyRoom';
import { Stub } from './screens/Stub';

export function App() {
  return (
    <Routes>
      {/* Onboarding */}
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/nickname" element={<Nickname />} />
      <Route path="/interests" element={<Interests />} />
      <Route path="/myroom-onboarding" element={<MyRoomOnboarding />} />
      <Route path="/attendance" element={<Attendance />} />

      {/* Main */}
      <Route path="/home" element={<Home />} />
      <Route path="/myroom" element={<MyRoom />} />

      {/* 다른 탭은 Stub */}
      <Route path="/map"   element={<Stub title="지도" />} />
      <Route path="/board" element={<Stub title="게시판" />} />
      <Route path="/chat"  element={<Stub title="채팅" />} />
      <Route path="/me"    element={<Stub title="마이페이지" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
