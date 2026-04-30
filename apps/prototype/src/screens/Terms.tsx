import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { Icon } from '../components/Icon';
import './Form.css';

const ITEMS = [
  { id: 'age',  label: '만 14세 이상입니다. (필수)', required: true },
  { id: 'tos',  label: '서비스 이용약관에 동의 (필수)', required: true },
  { id: 'priv', label: '개인정보 수집 및 이용에 동의 (필수)', required: true },
  { id: 'loc',  label: '위치 정보 수집 및 이용에 동의 (필수)', required: true },
  { id: 'reco', label: '맞춤 프로그램 참여에 동의 (선택)', required: false },
  { id: 'mkt',  label: '광고 및 마케팅 수신에 동의 (선택)', required: false },
];

export function Terms() {
  const nav = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allChecked = ITEMS.every(i => checked[i.id]);
  const requiredOk = useMemo(() => ITEMS.filter(i => i.required).every(i => checked[i.id]), [checked]);

  const toggleAll = () => {
    if (allChecked) setChecked({});
    else setChecked(Object.fromEntries(ITEMS.map(i => [i.id, true])));
  };
  const toggle = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }));

  return (
    <Phone>
      <div className="form-screen screen-body">
        <button className="back-btn" onClick={() => nav(-1)} aria-label="뒤로">
          <Icon name="chevron-left" />
        </button>
        <div className="progress"><div className="progress-fill" style={{ width: '20%' }} /></div>

        <div style={{ padding: '0 24px' }}>
          <h1 className="page-title">HOLO 서비스 사용에 필요한<br/>이용 약관에 <b>동의</b>해 주세요!</h1>

          <button className={`agree-all ${allChecked ? 'on' : ''}`} onClick={toggleAll} type="button">
            <span className="check">
              <Icon name="check" size={16} />
            </span>
            모두 동의 (선택 정보 포함)
          </button>

          <ul className="agree-list">
            {ITEMS.map(item => (
              <li key={item.id}>
                <button className={`agree-row ${checked[item.id] ? 'on' : ''}`} type="button" onClick={() => toggle(item.id)}>
                  <span className="check">
                    <Icon name="check" size={14} />
                  </span>
                  <span className="row-label">{item.label}</span>
                  <Icon name="chevron-right" size={16} className="row-more" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg" disabled={!requiredOk} onClick={() => nav('/verify')}>
            다음
          </button>
        </div>
      </div>
    </Phone>
  );
}
