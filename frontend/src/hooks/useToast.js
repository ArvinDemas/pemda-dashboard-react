/**
 * Toast Notification Hook
 * Simple toast notifications using react-hot-toast
 * Install: npm install react-hot-toast
 */

import toast from 'react-hot-toast';

/**
 * Success toast
 */
export const showSuccess = (message, options = {}) => {
    return toast.success(message, {
        duration: 3000,
        position: 'top-right',
        style: {
            background: '#10b981',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: '600',
        },
        iconTheme: {
            primary: 'white',
            secondary: '#10b981',
        },
        ...options,
    });
};

/**
 * Error toast
 */
export const showError = (message, options = {}) => {
    return toast.error(message, {
        duration: 4000,
        position: 'top-right',
        style: {
            background: '#f59e0b',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: '600',
        },
        iconTheme: {
            primary: 'white',
            secondary: '#f59e0b',
        },
        ...options,
    });
};

/**
 * Info toast
 */
export const showInfo = (message, options = {}) => {
    return toast(message, {
        duration: 3000,
        position: 'top-right',
        icon: 'ℹ️',
        style: {
            background: '#0ea5e9',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: '600',
        },
        ...options,
    });
};

/**
 * Warning toast
 */
export const showWarning = (message, options = {}) => {
    return toast(message, {
        duration: 3500,
        position: 'top-right',
        icon: '⚠️',
        style: {
            background: '#f59e0b',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: '600',
        },
        ...options,
    });
};

/**
 * Loading toast
 */
export const showLoading = (message = 'Loading...', options = {}) => {
    return toast.loading(message, {
        position: 'top-right',
        style: {
            background: '#0f172a',
            color: 'white',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: '600',
        },
        ...options,
    });
};

/**
 * Promise toast - automatically handles success/error
 */
export const showPromise = (promise, messages = {}) => {
    return toast.promise(
        promise,
        {
            loading: messages.loading || 'Loading...',
            success: messages.success || 'Success!',
            error: messages.error || 'Error occurred',
        },
        {
            position: 'top-right',
            style: {
                padding: '16px',
                borderRadius: '12px',
                fontWeight: '600',
            },
        }
    );
};

const toastHelpers = {
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: showLoading,
    promise: showPromise,
};

export default toastHelpers;
