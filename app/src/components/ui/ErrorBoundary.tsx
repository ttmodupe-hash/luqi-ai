import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
          <p className="text-gray-400">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 rounded">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
