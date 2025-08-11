import React, { Component, ReactNode } from 'react';
import { Button } from 'antd-mobile';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                应用出现错误
              </h2>
              <p className="text-gray-600 mb-4">
                很抱歉，应用遇到了一个意外错误。请尝试刷新页面或联系技术支持。
              </p>
              
              {this.state.error && (
                <details className="text-left mb-4">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    查看错误详情
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="space-y-2">
                <Button 
                  block 
                  color="primary" 
                  onClick={this.handleReload}
                  className="mb-2"
                >
                  <RefreshCw/>
                  刷新页面
                </Button>
                <Button 
                  block 
                  fill="outline" 
                  onClick={this.handleReset}
                >
                  重试
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;