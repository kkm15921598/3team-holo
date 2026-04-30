import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { Icon } from '../components/Icon';
import { mockInterests } from '../mocks/data';
import './Form.css';

export function Interests() {
  const nav = useNavigate();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState('');

  const toggle = (k: string) =>
    setPicked(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  return (
    <Phone>
      <div className="form-screen screen-body">
        <button className="back-btn" onClick={() => nav(-1)}><Icon name="chevron-left" /></button>
        <div className="progress"><div className="progress-fill" style={{ width: '70%' }} /></div>

        <div style={{ padding: '0 24px' }}>
          <h1 className="page-title">어떤 주제에<br/><b>관심이 있으신가요?</b></h1>
          <p className="page-sub">선택하신 주제로 추천 모임을 보여드릴게요.</p>

          <div style={{ height: 20 }} />

          <div className="chips">
            {mockInterests.map(t => (
              <button key={t} type="button"
                      className={`chip ${picked.has(t) ? 'on' : ''}`}
                      onClick={() => toggle(t)}>
                + {t}
              </button>
            ))}
          </div>

          <div style={{ height: 16 }} />
          <input className="input" placeholder="직접 입력 (선택)"
                 value={custom} onChange={e => setCustom(e.target.value)} />
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg"
                  disabled={picked.size === 0 && !custom.trim()}
                  onClick={() => nav('/myroom-onboarding')}>
            다음
          </button>
        </div>
      </div>
    </Phone>
  );
}
