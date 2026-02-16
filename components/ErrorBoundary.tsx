import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackUI?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });

        // TODO: Log error to external service (e.g., Sentry, LogRocket)
        // logErrorToService(error, errorInfo);
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback UI if provided
            if (this.props.fallbackUI) {
                return this.props.fallbackUI;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-4 border-red-500">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-red-500 rounded-full">
                                <AlertTriangle size={40} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                                    Oops! Something went wrong
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    KorfStat Pro encountered an unexpected error
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded mb-6">
                            <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-2">
                                Error Details:
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-400 font-mono">
                                {this.state.error?.toString()}
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <details className="mb-6">
                                <summary className="cursor-pointer text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Stack Trace (Development Mode)
                                </summary>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-64 text-gray-800 dark:text-gray-200">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                <Home size={20} />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                <RefreshCw size={20} />
                                Reload Page
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Your match data is safe and stored locally.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                If this problem persists, try clearing your browser cache or checking the browser console for more details.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
