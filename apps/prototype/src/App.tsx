/*
  스켈레톤 상태 — 폰트 로딩 확인용 임시 화면.
  첫 화면 시안을 받으면 이 파일을 교체합니다.
*/
export function App() {
  return (
    <div style={{ padding: 24, lineHeight: 1.6 }}>
      <h2 style={{ fontFamily: 'Fredoka', fontWeight: 600, margin: '0 0 4px' }}>
        Fredoka — HOLO 1234567890
      </h2>
      <h2 style={{ fontFamily: 'Paperlogy', fontWeight: 700, margin: '0 0 24px' }}>
        Paperlogy — 안녕하세요 가나다 라마바
      </h2>

      <h4 style={{ margin: '0 0 4px', color: '#888', fontWeight: 500 }}>Fredoka 굵기</h4>
      {[300, 400, 500, 600, 700].map(w => (
        <div key={w} style={{ fontFamily: 'Fredoka', fontWeight: w, fontSize: 18 }}>
          {w} — The quick brown fox 0123
        </div>
      ))}

      <h4 style={{ margin: '20px 0 4px', color: '#888', fontWeight: 500 }}>Paperlogy 굵기</h4>
      {[100, 300, 400, 500, 600, 700, 800, 900].map(w => (
        <div key={w} style={{ fontFamily: 'Paperlogy', fontWeight: w, fontSize: 18 }}>
          {w} — 다람쥐 헌 쳇바퀴에 타고파
        </div>
      ))}
    </div>
  );
}
