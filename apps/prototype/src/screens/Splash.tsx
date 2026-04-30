import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import './Splash.css';

export function Splash() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => nav('/login'), 1400);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <Phone>
      <div className="splash">
        <div className="splash-logo" aria-label="HOLO 로고">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            {/* 무한대 같은 H */}
            <path d="M16 24c-6 0-10 4-10 10s4 10 10 10c5 0 8-3 10-7l8-12c2-4 5-7 10-7s10 4 10 10-4 10-10 10c-5 0-8-3-10-7"
                  stroke="url(#lg)" strokeWidth="8" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <p className="splash-name">HOLO</p>
      </div>
    </Phone>
  );
}
