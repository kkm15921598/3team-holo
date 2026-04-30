import { useAuth } from "@/shared/auth/auth-context";

export function QrScreen() {
  const { session } = useAuth();
  const userId = session?.userId ?? "guest";

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-holo-gradient" aria-hidden />
        <p className="text-base font-semibold text-gray-900">{userId}</p>
        <p className="text-xs text-gray-500">QR을 보여주거나 스캔해서 친구를 추가하세요</p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <QrCodeMock />
      </div>

      <div className="flex w-full gap-3">
        <button
          type="button"
          className="flex-1 h-12 rounded-full bg-holo-gradient text-sm font-semibold text-white shadow-md active:scale-[0.99]"
        >
          내 QR 공유
        </button>
        <button
          type="button"
          className="flex-1 h-12 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50"
        >
          QR 스캔
        </button>
      </div>
    </div>
  );
}

function QrCodeMock() {
  const dots: { x: number; y: number }[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const seed = (x * 7 + y * 13 + x * y) % 5;
      if (seed < 2) dots.push({ x, y });
    }
  }
  const corners = [
    [0, 0],
    [14, 0],
    [0, 14],
  ];

  return (
    <svg width="200" height="200" viewBox="0 0 21 21" aria-label="QR 코드 미리보기">
      <rect width="21" height="21" fill="#fff" />
      {dots.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width="1" height="1" fill="#1F2937" />
      ))}
      {corners.map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx} y={cy} width="7" height="7" fill="#fff" />
          <rect x={cx} y={cy} width="7" height="1" fill="#1F2937" />
          <rect x={cx} y={cy + 6} width="7" height="1" fill="#1F2937" />
          <rect x={cx} y={cy} width="1" height="7" fill="#1F2937" />
          <rect x={cx + 6} y={cy} width="1" height="7" fill="#1F2937" />
          <rect x={cx + 2} y={cy + 2} width="3" height="3" fill="#1F2937" />
        </g>
      ))}
    </svg>
  );
}
