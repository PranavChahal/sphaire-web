import '../styles/globals.css';
import '../styles/AIModelingPanel.css';
import React from 'react';
import type { AppProps } from 'next/app';
import { BabylonProvider } from '../contexts/BabylonContext';

class ProductionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 PRODUCTION: Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#1a1a2e',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid #ff4757',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <h1 style={{ margin: '0 0 16px 0', color: '#ff4757' }}>
              🚨 Production Error
            </h1>
            <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
              The application encountered an unexpected error. Please refresh the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#ff4757',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  console.log('🚀 PRODUCTION APP: Starting with full external resource integration...');
  
  return (
    <ProductionErrorBoundary>
      <BabylonProvider>
        <Component {...pageProps} />
      </BabylonProvider>
    </ProductionErrorBoundary>
  );
}

export default MyApp;
