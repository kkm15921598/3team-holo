import './IsoRoom.css';

export type FurnitureKey =
  | 'bed-purple' | 'bed-yellow'
  | 'desk' | 'chair' | 'lamp' | 'plant' | 'beanbag'
  | 'frame' | 'rug';

export type RoomLayout = {
  bed?: FurnitureKey;
  desk?: boolean;
  chair?: boolean;
  lamp?: boolean;
  plant?: boolean;
  beanbag?: boolean;
  frame?: boolean;
  rug?: boolean;
};

type Props = {
  layout?: RoomLayout;
  showCharacter?: boolean;
  characterEmoji?: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * 아이소메트릭 마이룸 (디자인 시안 기준)
 * - 보라 벽 + 우드 바닥
 * - 가구는 PNG/이모지 stand-in 으로 우선 표현 (Supabase Storage 연결 시 PNG 교체)
 */
export function IsoRoom({ layout = {}, showCharacter = false, characterEmoji = '🧑', size = 'md' }: Props) {
  return (
    <div className={`iso-room iso-room-${size}`} role="img" aria-label="내 방">
      {/* 벽과 바닥은 SVG로 그려 안정적인 아이소메트릭 형태 유지 */}
      <svg viewBox="0 0 320 280" className="iso-svg" aria-hidden="true">
        <defs>
          <linearGradient id="wallL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9B0EE" />
            <stop offset="100%" stopColor="#A586D6" />
          </linearGradient>
          <linearGradient id="wallR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B69BD8" />
            <stop offset="100%" stopColor="#8E70BE" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D6B589" />
            <stop offset="100%" stopColor="#B58E5C" />
          </linearGradient>
          <pattern id="planks" width="40" height="20" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
            <rect width="40" height="20" fill="url(#floor)" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(0,0,0,.15)" strokeWidth="1" />
            <line x1="20" y1="0" x2="20" y2="20" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* 좌측 벽 */}
        <polygon points="40,40 160,90 160,210 40,160" fill="url(#wallL)" />
        {/* 우측 벽 */}
        <polygon points="160,90 280,40 280,160 160,210" fill="url(#wallR)" />
        {/* 바닥 (마름모) */}
        <polygon points="40,160 160,210 280,160 160,110" fill="url(#planks)" />
        {/* 바닥 outline */}
        <polygon points="40,160 160,210 280,160 160,110" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
      </svg>

      {/* 가구 — 절대 위치 이모지/PNG */}
      <div className="furn-layer">
        {layout.frame && <span className="furn furn-frame" aria-hidden="true">🖼️</span>}
        {layout.lamp && <span className="furn furn-lamp" aria-hidden="true">💡</span>}
        {layout.desk && <span className="furn furn-desk" aria-hidden="true">🗄️</span>}
        {layout.chair && <span className="furn furn-chair" aria-hidden="true">🪑</span>}
        {layout.bed && <span className={`furn furn-bed ${layout.bed === 'bed-yellow' ? 'bed-y' : 'bed-p'}`} aria-hidden="true">🛏️</span>}
        {layout.beanbag && <span className="furn furn-beanbag" aria-hidden="true">🟣</span>}
        {layout.plant && <span className="furn furn-plant" aria-hidden="true">🪴</span>}
        {layout.rug && <span className="furn furn-rug" aria-hidden="true">🟫</span>}

        {showCharacter && <span className="furn furn-char" aria-hidden="true">{characterEmoji}</span>}
      </div>
    </div>
  );
}
