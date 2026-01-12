/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-8">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-900/20 border-2 border-red-600 rounded-full mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-zinc-100 text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-6">
              <p className="text-sm font-mono text-red-400 mb-2">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                    Show technical details
                  </summary>
                  <pre className="mt-2 text-xs text-zinc-500 overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-center mb-8">
              We're sorry for the inconvenience. Your images are safe and haven't been uploaded anywhere.
              Try one of the options below:
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Reload App
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-zinc-600 text-center mt-8">
              💡 All processing happens in your browser. No data has been sent to any server.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
