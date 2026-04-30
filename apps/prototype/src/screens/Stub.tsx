import { Phone } from '../components/Phone';
import { AppHeader } from '../components/AppHeader';
import { TabBar } from '../components/TabBar';

export function Stub({ title }: { title: string }) {
  return (
    <Phone>
      <AppHeader />
      <div className="screen-body" style={{
        display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{title}</h2>
          <p style={{ color: 'var(--text-3)', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            이 탭은 다음 PR에서 구현됩니다.<br/>
            현재는 <b>온보딩 + 홈 + 마이룸</b> 까지 동작해요.
          </p>
        </div>
      </div>
      <TabBar />
    </Phone>
  );
}
