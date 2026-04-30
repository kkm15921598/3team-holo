import { ReactNode } from 'react';
import { StatusBar } from './StatusBar';

export function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas">
      <div className="phone">
        <StatusBar />
        {children}
      </div>
    </div>
  );
}
