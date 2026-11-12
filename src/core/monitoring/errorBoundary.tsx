import { Component, type ErrorInfo, type ReactNode } from 'react';

interface FallbackArgs {
  error: Error;
  /** Clear the error and render the children again. */
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Shown instead of the crashed tree. A function receives the error and a `reset`.
   * Defaults to a bare message (the raw error is never shown).
   */
  fallback?: ReactNode | ((args: FallbackArgs) => ReactNode);
  /** Called after the boundary is reset, whether by `reset()` or by `resetKeys` changing. */
  onReset?: () => void;
  /** Called when a descendant throws. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** When any entry changes while the boundary is showing an error, it resets. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function keysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));
}

/**
 * Error Boundary Component
 * Catches render errors below it and shows a fallback. Resettable via `reset()` (passed to a
 * function fallback, or call it on a ref) or by changing `resetKeys`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => {
    if (!this.state.hasError) return;
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback({ error: error as Error, reset: this.reset });
      }
      if (fallback !== undefined) return fallback;
      return (
        <div>
          <h1 className="text-[3.2em] leading-[1.1]">Something went wrong.</h1>
        </div>
      );
    }

    return this.props.children;
  }
}
