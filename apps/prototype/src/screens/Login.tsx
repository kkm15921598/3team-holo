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
    // mock: 어떤 입력이든 통과
    nav('/home');
  };

  return (
    <Phone>
      <div className="login screen-body">
        <div className="login-logo">
          <svg viewBox="0 0 80 80" width="64" height="64">
            <defs>
              <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <path d="M16 24c-6 0-10 4-10 10s4 10 10 10c5 0 8-3 10-7l8-12c2-4 5-7 10-7s10 4 10 10-4 10-10 10c-5 0-8-3-10-7"
                  stroke="url(#lg2)" strokeWidth="8" fill="none" strokeLinecap="round" />
          </svg>
          <p className="login-brand">HOLO</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <input className="input" type="email" placeholder="이메일 (아이디) 입력"
                 value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="비밀번호 입력"
                 value={pw} onChange={e => setPw(e.target.value)} required />
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
