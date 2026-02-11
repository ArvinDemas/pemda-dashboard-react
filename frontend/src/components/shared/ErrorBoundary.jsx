/**
 * Error Boundary Component
 * Catches React rendering errors and displays fallback UI
 * Following react-best-practices for error handling
 */

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (in production, send to error tracking service)
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

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-card">
                        <div className="error-icon">
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>

                        <h2>Oops! Something went wrong</h2>
                        <p className="error-message">
                            We're sorry, but something unexpected happened. Please try again.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-details">
                                <summary>Error Details (Dev Mode)</summary>
                                <pre>{this.state.error.toString()}</pre>
                                {this.state.errorInfo && (
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                )}
                            </details>
                        )}

                        <div className="error-actions">
                            <button onClick={this.handleReset} className="btn-primary">
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-secondary"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
