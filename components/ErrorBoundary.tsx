"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="card" 
          style={{ 
            padding: 24, 
            margin: "20px 0",
            background: "rgba(255, 59, 59, 0.1)", 
            border: "1px solid rgba(255, 59, 59, 0.3)" 
          }}
        >
          <div style={{ display: "grid", gap: 12, textAlign: "center" }}>
            <h3 style={{ margin: 0, color: "var(--danger)" }}>
              ⚠️ Something went wrong
            </h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              An error occurred while loading this component. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: 12, 
                padding: 12, 
                background: "rgba(255,255,255,0.05)", 
                borderRadius: 8,
                textAlign: "left",
                fontSize: 12
              }}>
                <summary style={{ cursor: "pointer", marginBottom: 8 }}>
                  Error Details (Development)
                </summary>
                <pre style={{ 
                  color: "var(--danger)", 
                  whiteSpace: "pre-wrap", 
                  wordBreak: "break-word",
                  margin: 0
                }}>
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      <br /><br />
                      Stack trace:
                      <br />
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <button 
              className="button"
              onClick={() => {
                this.setState({ hasError: false, error: undefined, errorInfo: undefined });
              }}
              style={{ justifySelf: "center", maxWidth: "fit-content" }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}