import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { Icon } from '../components/Icon';
import './Form.css';

export function Verify() {
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  const sendCode = () => {
    if (!/^01[016789]\d{7,8}$/.test(phone)) return;
    setSent(true);
  };

  return (
    <Phone>
      <div className="form-screen screen-body">
        <button className="back-btn" onClick={() => nav(-1)}><Icon name="chevron-left" /></button>
        <div className="progress"><div className="progress-fill" style={{ width: '40%' }} /></div>

        <div style={{ padding: '0 24px' }}>
          <h1 className="page-title">안전한 서비스 이용을 위해<br/><b>본인인증</b>을 진행해 주세요!</h1>
          <p className="page-sub">개인정보는 본인 확인 후 즉시 삭제됩니다.</p>

          <div style={{ height: 24 }} />

          <div className="field">
            <input className="input" placeholder="휴대폰 번호 (-없이)"
                   value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                   inputMode="numeric" maxLength={11} />
            <button className="btn btn-ghost" type="button" onClick={sendCode}>
              {sent ? '재전송' : '인증요청'}
            </button>
          </div>

          {sent && (
            <>
              <input className="input" placeholder="인증번호 6자리"
                     value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                     inputMode="numeric" maxLength={6} />
              <p className="help">전송된 6자리 숫자를 입력해 주세요. (테스트: 아무 숫자 6자리)</p>
            </>
          )}
        </div>

        <div className="form-footer">
          <button className="btn btn-dark btn-block btn-lg" disabled={!sent || code.length < 6}
                  onClick={() => nav('/nickname')}>
            인증하기
          </button>
        </div>
      </div>
    </Phone>
  );
}
