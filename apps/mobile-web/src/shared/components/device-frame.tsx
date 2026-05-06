import type { ReactNode } from "react";

export function DeviceFrame({ children }: { children: ReactNode }) {
  return <div className="device-frame">{children}</div>;
}
