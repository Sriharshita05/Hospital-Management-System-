import { Component } from "react";

/**
 * React Error Boundary
 * Catches any render-time JS error and shows a friendly fallback instead of a blank page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          background: "#f8fafc",
          fontFamily: "sans-serif",
          padding: "24px"
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ color: "#1e293b", margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "#64748b", maxWidth: 480, textAlign: "center" }}>
            {this.state.errorMsg}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: "10px 24px",
              background: "#2457d6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;