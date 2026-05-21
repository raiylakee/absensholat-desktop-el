import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a2e",
            color: "#e0e0e0",
            fontFamily: "monospace",
            padding: 40,
            zIndex: 9999,
          }}
        >
          <div style={{ maxWidth: 600 }}>
            <h1 style={{ color: "#ff6b6b", fontSize: 20, marginBottom: 16 }}>
              Terjadi Kesalahan
            </h1>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              Aplikasi mengalami error saat memuat. Silakan restart aplikasi.
            </p>
            <pre
              style={{
                background: "#0d0d1a",
                padding: 16,
                borderRadius: 8,
                overflow: "auto",
                fontSize: 12,
                color: "#ff9999",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
