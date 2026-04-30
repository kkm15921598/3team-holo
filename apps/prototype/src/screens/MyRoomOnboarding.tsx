import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { Icon } from '../components/Icon';
import { IsoRoom } from '../components/IsoRoom';
import { useStore } from '../lib/store';
import './MyRoomOnboarding.css';

const STARTERS = [
  { key: 'desk',     emoji: '🗄️', label: '책상' },
  { key: 'chair',    emoji: '🪑', label: '의자' },
  { key: 'lamp',     emoji: '💡', label: '스탠드' },
  { key: 'plant',    emoji: '🪴', label: '식물' },
] as const;

export function MyRoomOnboarding() {
  const nav = useNavigate();
  const { user, placeFurniture, toast } = useStore();
  const [filter, setFilter] = useState<'전체' | '책상' | '소품'>('전체');

  return (
    <Phone>
      <div className="form-screen screen-body">
        <button className="back-btn" onClick={() => nav(-1)}><Icon name="chevron-left" /></button>
        <div className="progress"><div className="progress-fill" style={{ width: '85%' }} /></div>

        <div style={{ padding: '0 24px 16px' }}>
          <h1 className="page-title">거의 다 왔어요!<br/><b>{user.nickname}</b> 님의 방을 꾸며보세요!</h1>
          <p className="page-sub">기본 가구 4종을 무료로 드려요. 더 다양한 가구는 출석 보상으로 모을 수 있어요.</p>
        </div>

        <div style={{ padding: '0 16px' }}>
          <IsoRoom layout={user.layout} />
        </div>

        <div className="cat-tabs">
          {(['전체', '책상', '소품'] as const).map(c => (
            <button key={c}
                    className={`cat-tab ${filter === c ? 'on' : ''}`}
                    onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="furn-grid">
          {STARTERS.map(s => (
            <button key={s.key} className="furn-card" onClick={() => {
              placeFurniture(s.key as any);
              toast(`${s.label} 추가됨`);
            }}>
              <div className="furn-thumb">{s.emoji}</div>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg" onClick={() => nav('/attendance')}>
            다음
          </button>
        </div>
      </div>
    </Phone>
  );
}
