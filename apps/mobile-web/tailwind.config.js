/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        holo: {
          // Brand purple
          purple: "#B77CFF",          // 로고/스플래시 (라이트)
          "purple-mid": "#7448DD",    // 포커스/선택 (가장 자주)
          "purple-deep": "#542BB4",   // 그라데이션 시작
          "purple-text": "#6C49E8",   // 포인트 텍스트
          // Brand pink/accent
          pink: "#E95AA4",            // 그라데이션 끝 (홈/공통)
          "pink-soft": "#FF6CB8",     // 그라데이션 끝 (마이/뱃지)
          // Text
          ink: "#191919",
          "ink-2": "#5D5D5D",
          "ink-3": "#979797",
          "ink-4": "#A8A8A8",
          // Surfaces
          surface: "#FAFAFA",
          "surface-2": "#F2F2F2",
          "surface-3": "#F6F6F6",
          // Borders
          line: "#D9D9D9",
          "line-2": "#E2E2E2",
          "line-3": "#EEEEEE",
          // Soft accents
          "lilac-soft": "#DED9F8",    // 그림자 톤
          "lilac-card": "#EBE3F5",    // 모임 카드 배경
          "lilac-card-2": "#EBE4F5",
          "lilac-light": "#CCBCE0",
          "lilac-deep": "#C7BDFF",
          "lilac-hero": "#DDC0FF",
          // Status
          success: "#CAE4B9",         // 모집중
          full: "#FFCFCF",            // 모집완료
          "top-live-bg": "#FFE2E2",
          "top-live-bd": "#FFC7C7",
          error: "#FF4343",
          "error-2": "#FF0000",
          // Special
          "yellow-room": "#FCEBB5",   // 프로필 박스 배경
          crown: "#FFCB3B",
        },
      },
      fontFamily: {
        paperlogy: ['"Paperlogy"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        fredoka: ['"Fredoka"', "system-ui", "sans-serif"],
        spoqa: ['"Spoqa Han Sans Neo"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      backgroundImage: {
        "holo-gradient": "linear-gradient(90deg, #542BB4 0%, #E95AA4 100%)",
        "holo-gradient-soft": "linear-gradient(90deg, #7448DD 0%, #FF6CB8 100%)",
        "holo-hero": "linear-gradient(180deg, #DDC0FF 0%, #FFFFFF 100%)",
      },
      boxShadow: {
        "holo-card": "0 0 8.3px #DED9F8",
      },
      borderRadius: {
        "holo-pill": "30px",
        "holo-card": "20px",
        "holo-input": "15px",
        "holo-tile": "10px",
      },
    },
  },
  plugins: [],
};
