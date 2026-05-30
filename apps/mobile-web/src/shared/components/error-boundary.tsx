import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * 앱 최상단 에러 바운더리.
 * 렌더 중 예기치 못한 런타임 오류가 나도 화면이 통째로 백지가 되지 않도록,
 * 안내 메시지 + 새로고침 버튼을 대신 보여준다. (인라인 스타일 — CSS 로드 실패에도 표시)
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[HOLO] 화면 렌더 중 오류:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            color: "#1A1A1A",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 40 }}>🛠️</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            일시적인 오류가 발생했어요
          </div>
          <div style={{ fontSize: 13, color: "#888", maxWidth: 280 }}>
            잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침해 주세요.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "10px 20px",
              borderRadius: 999,
              border: "none",
              background: "#7448DD",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
