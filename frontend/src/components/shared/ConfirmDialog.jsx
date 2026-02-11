/**
 * Confirm Dialog Component
 * Accessible modal dialog for confirmation actions
 * Following ui-ux-pro-max accessibility guidelines (ARIA, keyboard nav, focus management)
 */

import React, { useEffect, useRef } from 'react';

const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger', // 'danger' | 'warning' | 'info'
}) => {
    const dialogRef = useRef(null);
    const confirmButtonRef = useRef(null);

    // Focus management - Focus confirm button when dialog opens
    useEffect(() => {
        if (isOpen && confirmButtonRef.current) {
            confirmButtonRef.current.focus();
        }
    }, [isOpen]);

    // Keyboard handling - ESC to cancel
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconColor: '#f59e0b',
            confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        },
        warning: {
            iconColor: '#f59e0b',
            confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        },
        info: {
            iconColor: '#0ea5e9',
            confirmBg: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        },
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div
            className="confirm-dialog-overlay"
            onClick={onCancel}
            role="presentation"
            aria-hidden="true"
        >
            <div
                ref={dialogRef}
                className="confirm-dialog"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                aria-describedby="dialog-description"
            >
                <div className="dialog-icon" style={{ color: styles.iconColor }}>
                    <svg
                        width="48"
                        height="48"
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

                <h3 id="dialog-title" className="dialog-title">
                    {title}
                </h3>

                <p id="dialog-description" className="dialog-message">
                    {message}
                </p>

                <div className="dialog-actions">
                    <button
                        onClick={onCancel}
                        className="btn-cancel"
                        autoFocus={false}
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className="btn-confirm"
                        style={{ background: styles.confirmBg }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
