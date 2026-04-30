import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { mockAttendance } from '../mocks/data';
import { useStore } from '../lib/store';
import './Attendance.css';

export function Attendance() {
  const nav = useNavigate();
  const { user, updateUser, toast } = useStore();
  const [days, setDays] = useState(mockAttendance.days);
  const [claimed, setClaimed] = useState(false);

  const todayIdx = days.findIndex(d => d.today);
  const today = days[todayIdx];

  const claim = () => {
    if (!today || claimed) return;
    const reward = today.reward ?? 0;
    setDays(ds => ds.map((d, i) => i === todayIdx ? { ...d, done: true, today: false } : d));
    updateUser({ points: user.points + reward });
    toast(`+${reward}P 획득!`);
    setClaimed(true);
    setTimeout(() => nav('/home'), 700);
  };

  return (
    <Phone>
      <div className="attend screen-body">
        <div className="attend-logo">
          <svg viewBox="0 0 80 80" width="48" height="48">
            <defs>
              <linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <path d="M16 24c-6 0-10 4-10 10s4 10 10 10c5 0 8-3 10-7l8-12c2-4 5-7 10-7s10 4 10 10-4 10-10 10c-5 0-8-3-10-7"
                  stroke="url(#lg3)" strokeWidth="8" fill="none" strokeLinecap="round" />
          </svg>
          <p className="attend-title">출석체크</p>
        </div>

        <div className="attend-grid">
          {days.map((d, i) => (
            <div key={i} className={`attend-cell ${d.done ? 'done' : ''} ${d.today ? 'today' : ''} ${d.isAllClear ? 'all' : ''}`}>
              <div className="day">{d.isAllClear ? 'ALL CLEAR!' : `${d.day}일차`}</div>
              <div className="reward">
                {d.done ? '✓' : (d.isAllClear ? `${d.allClearReward}P` : `${d.reward}P`)}
              </div>
            </div>
          ))}
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg" onClick={claim} disabled={!today || claimed}>
            {claimed ? '받았어요!' : '보상받기'}
          </button>
          <button className="btn-skip" onClick={() => nav('/home')}>나중에 받기</button>
        </div>
      </div>
    </Phone>
  );
}
