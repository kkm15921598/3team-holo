import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { Icon } from '../components/Icon';
import { useStore } from '../lib/store';
import './Form.css';

export function Nickname() {
  const nav = useNavigate();
  const { updateUser, toast } = useStore();
  const [nick, setNick] = useState('');

  const valid = nick.length >= 1 && nick.length <= 10 && /^[가-힣a-zA-Z0-9]+$/.test(nick);

  const submit = () => {
    if (!valid) return;
    updateUser({ nickname: nick });
    toast('닉네임이 설정되었어요!');
    nav('/interests');
  };

  return (
    <Phone>
      <div className="form-screen screen-body">
        <button className="back-btn" onClick={() => nav(-1)}><Icon name="chevron-left" /></button>
        <div className="progress"><div className="progress-fill" style={{ width: '55%' }} /></div>

        <div style={{ padding: '0 24px' }}>
          <h1 className="page-title">HOLO에서 사용할<br/>당신의 이름을 정해주세요!</h1>
          <p className="page-sub">한글, 영문, 숫자 포함 1~10자.</p>

          <div style={{ height: 24 }} />

          <input className="input" placeholder="닉네임을 입력해 주세요"
                 value={nick} onChange={e => setNick(e.target.value)} maxLength={10} />
          <p className={`help ${nick && !valid ? 'err' : valid ? 'ok' : ''}`}>
            {!nick ? '한글, 영문, 숫자만 사용할 수 있어요.' :
              valid ? '✓ 사용 가능한 닉네임이에요.' : '특수문자나 공백은 사용할 수 없어요.'}
          </p>
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg" disabled={!valid} onClick={submit}>
            다음
          </button>
        </div>
      </div>
    </Phone>
  );
}
