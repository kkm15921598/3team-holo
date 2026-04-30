import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { AppHeader } from '../components/AppHeader';
import { TabBar } from '../components/TabBar';
import { Icon } from '../components/Icon';
import { useStore } from '../lib/store';
import { mockRecommendations } from '../mocks/data';
import './Home.css';

export function Home() {
  const nav = useNavigate();
  const { user, toast } = useStore();

  return (
    <Phone>
      <AppHeader />

      <div className="screen-body home">
        {/* 마이룸 카드 (그라데이션 배경 + 상태 메시지만) */}
        <button className="myroom-card" onClick={() => nav('/myroom')}>
          <div className="myroom-bg" />
          <div className="status-bubble">상태 메시지</div>
        </button>

        {/* 프로필 영역 */}
        <section className="profile-card">
          <div className="profile-row">
            <div className="profile-avatar">{user.characterEmoji}</div>
            <div className="profile-meta">
              <div className="profile-top">
                <span className="nick">{user.nickname}</span>
                <span className="lv">Lv.{user.level}</span>
              </div>
              <div className="profile-tags">
                {user.tags.map(t => <span key={t}>{t}</span>)}
              </div>
            </div>
          </div>
        </section>

        {/* 추천 모임 */}
        <section className="reco">
          <div className="reco-head">
            <p className="reco-q">어떤 모임에 들어갈지 고민되시나요?</p>
            <p className="reco-title">
              <b>{user.nickname}</b> 님을 위한 <span className="grad-text">추천 모임</span>
              <button className="reco-refresh" aria-label="새로고침" onClick={() => toast('새로 추천했어요!')}>
                <Icon name="refresh" size={16} />
              </button>
            </p>
          </div>

          <div className="reco-list">
            {mockRecommendations.map(r => (
              <div key={r.id} className="reco-card">
                <div className="reco-card-head">
                  <span className="reco-card-title">{r.title}</span>
                  <Icon name="arrow-up-right" size={16} />
                </div>
                <div className="reco-card-meta">
                  {r.distance} · {r.duration}
                </div>
                <p className="reco-card-desc">{r.desc}</p>
                <div className="reco-card-people">
                  {r.participants.slice(0, 3).map((p, i) => (
                    <span key={i} className="people-emoji">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ height: 80 }} />
      </div>

      <button className="fab" onClick={() => toast('글쓰기 / 모임 만들기 (준비중)')} aria-label="새 모임 만들기">
        <Icon name="plus" size={24} />
      </button>

      <TabBar />
    </Phone>
  );
}
