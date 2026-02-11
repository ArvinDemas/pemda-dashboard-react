/**
 * Loading Spinner Component
 * Reusable loading indicator with variants
 */

import React from 'react';

const Loading = ({
    size = 'medium',
    variant = 'primary',
    fullScreen = false,
    message = 'Loading...'
}) => {
    const sizeClasses = {
        small: 'loading-sm',
        medium: 'loading-md',
        large: 'loading-lg',
    };

    const variantClasses = {
        primary: 'loading-primary',
        secondary: 'loading-secondary',
        white: 'loading-white',
    };

    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                <div className={`loading-spinner ${sizeClasses[size]} ${variantClasses[variant]}`}>
                    <div className="spinner"></div>
                </div>
                {message && <p className="loading-message">{message}</p>}
            </div>
        );
    }

    return (
        <div className={`loading-spinner ${sizeClasses[size]} ${variantClasses[variant]}`}>
            <div className="spinner"></div>
        </div>
    );
};

export default Loading;
