import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: 'var(--danger, #ef4444)' }}>Something went wrong.</h1>
          <p style={{ color: 'var(--text-muted, #6b7280)' }}>The application encountered an unexpected error.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              background: 'var(--primary, #3b82f6)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <div style={{ marginTop: '2rem', textAlign: 'left', background: '#f1f5f9', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
              <pre style={{ color: '#ef4444' }}>{this.state.error?.toString()}</pre>
              <pre style={{ fontSize: '0.8rem', color: '#64748b' }}>{this.state.errorInfo?.componentStack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
