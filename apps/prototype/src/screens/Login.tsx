import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone } from '../components/Phone';
import './Login.css';

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nav('/home');
  };

  return (
    <Phone>
      <div className="login screen-body">
        <div className="login-logo">
          <img src="/holo-logo.svg" alt="HOLO" width={96} height={82} />
          <p className="login-brand">HOLO</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label className="input-wrap">
            <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18"
                 fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <input className="input has-icon" type="email" placeholder="이메일 아이디 입력"
                   value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label className="input-wrap">
            <svg className="input-icon" viewBox="0 0 24 24" width="18" height="18"
                 fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
            </svg>
            <input className="input has-icon" type="password" placeholder="비밀번호 입력"
                   value={pw} onChange={e => setPw(e.target.value)} required />
          </label>

          <button className="btn btn-primary btn-block btn-lg" type="submit">로그인</button>
        </form>

        <p className="login-or">또는</p>
        <div className="login-social">
          <button aria-label="Google 로그인" className="social google">G</button>
          <button aria-label="카카오 로그인" className="social kakao">K</button>
          <button aria-label="네이버 로그인" className="social naver">N</button>
        </div>

        <div className="login-links">
          <Link to="/terms">회원가입</Link>
          <span>·</span>
          <a href="#">아이디 찾기</a>
          <span>·</span>
          <a href="#">비밀번호 찾기</a>
        </div>
      </div>
    </Phone>
  );
}
