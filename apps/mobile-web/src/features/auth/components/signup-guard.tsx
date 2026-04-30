import { Navigate, Outlet } from "react-router-dom";
import { SignupProvider } from "@/features/auth/signup-context";
import { useAuth } from "@/shared/auth/auth-context";

export function SignupGuard() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <SignupProvider>
      <Outlet />
    </SignupProvider>
  );
}
