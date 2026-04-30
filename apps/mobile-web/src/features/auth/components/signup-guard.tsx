import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/shared/auth/auth-context";

export function SignupGuard() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
