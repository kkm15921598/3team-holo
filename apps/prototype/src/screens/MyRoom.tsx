import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from '../components/Phone';
import { TabBar } from '../components/TabBar';
import { Icon } from '../components/Icon';
import { IsoRoom } from '../components/IsoRoom';
import { useStore } from '../lib/store';
import type { FurnitureItem } from '../mocks/data';
import './MyRoom.css';
import './MyRoomOnboarding.css';

const CATEGORIES = ['전체', '침대', '책상', '의자', '벽지', '바닥', '소품'] as const;
type Category = typeof CATEGORIES[number];

export function MyRoom() {
  const nav = useNavigate();
  const { user, furniture, buyFurniture, placeFurniture, toast } = useStore();
  const [cat, setCat] = useState<Category>('침대');

  const list = cat === '전체' ? furniture : furniture.filter(f => f.category === cat);

  const onCardClick = (item: FurnitureItem) => {
    if (item.unlockLevel && user.level < item.unlockLevel) {
      toast(`Lv.${item.unlockLevel} 달성 시 해금돼요`);
      return;
    }
    if (item.owned) {
      placeFurniture(item.key);
      toast(`${item.name} 배치/해제됨`);
      return;
    }
    // 구매 흐름
    const result = buyFurniture(item.id);
    if (result.ok) {
      placeFurniture(item.key);
      toast(`${item.name} 구매 + 배치 완료!`);
    } else {
      toast(result.reason ?? '구매 실패');
    }
  };

  return (
    <Phone>
      <div className="myroom screen-body">
        <button className="back-btn" onClick={() => nav(-1)} aria-label="뒤로">
          <Icon name="chevron-left" />
        </button>

        {/* 프로필 미니 카드 */}
        <div className="mr-profile">
          <div className="profile-avatar">{user.characterEmoji}</div>
          <div>
            <div className="mr-profile-row">
              <span className="lv">Lv.{user.level}</span>
              <span className="nick">{user.nickname}</span>
            </div>
            <div className="mr-points">내 포인트 <b>{user.points.toLocaleString()} P</b></div>
          </div>
        </div>

        {/* 룸 미리보기 */}
        <div className="mr-room">
          <IsoRoom layout={user.layout} size="lg" />
        </div>

        {/* 카테고리 탭 */}
        <div className="cat-tabs mr-cats">
          {CATEGORIES.map(c => (
            <button key={c}
                    className={`cat-tab ${cat === c ? 'on' : ''}`}
                    onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        {/* 가구 그리드 */}
        <div className="mr-grid">
          {list.length === 0 && (
            <div className="mr-empty">아직 준비 중인 카테고리예요.</div>
          )}
          {list.map(item => {
            const locked = item.unlockLevel && user.level < item.unlockLevel;
            return (
              <button key={item.id} className={`mr-card ${locked ? 'locked' : ''}`}
                      onClick={() => onCardClick(item)}>
                {item.isNew && <span className="badge-new">NEW</span>}
                {locked && (
                  <span className="lock-overlay">
                    <Icon name="lock" size={20} />
                    <span>Lv.{item.unlockLevel} 달성 시 해금</span>
                  </span>
                )}
                <div className="mr-thumb">{thumbEmoji(item.key)}</div>
                <div className="mr-name">{item.name}</div>
                {!locked && (
                  item.owned
                    ? <div className="mr-pill owned">보유 중 · 탭하여 배치</div>
                    : <div className="mr-pill price">{item.price}P · 구매하기</div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>

      <TabBar />
    </Phone>
  );
}

function thumbEmoji(key: string) {
  switch (key) {
    case 'bed-purple': return '🛏️';
    case 'bed-yellow': return '🛌';
    case 'desk':       return '🗄️';
    case 'chair':      return '🪑';
    case 'lamp':       return '💡';
    case 'plant':      return '🪴';
    case 'beanbag':    return '🟣';
    case 'frame':      return '🖼️';
    default:           return '📦';
  }
}
