/**
 * File Uploader Component
 * Drag-and-drop file upload with validation and progress tracking
 * Following file-uploads skill: client-side validation, size limits, type checking
 * Following ui-ux-pro-max: accessible, responsive, clear feedback
 */

import React, { useState, useRef } from 'react';
import { CloudArrowUp, Upload, File, X, CheckCircle, WarningCircle } from 'phosphor-react';

const FileUploader = ({
    onFileSelect,
    acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize = 10 * 1024 * 1024, // 10MB default
    multiple = false,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        const errors = [];

        // Check file size
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            errors.push(`File size exceeds ${maxSizeMB}MB limit`);
        }

        // Check file type
        if (!acceptedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} not allowed`);
        }

        return errors;
    };

    const handleFiles = (files) => {
        const fileArray = Array.from(files);
        const validatedFiles = [];
        const allErrors = [];

        fileArray.forEach((file) => {
            const fileErrors = validateFile(file);

            if (fileErrors.length === 0) {
                validatedFiles.push({
                    file,
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    status: 'ready',
                });
            } else {
                allErrors.push({
                    fileName: file.name,
                    errors: fileErrors,
                });
            }
        });

        if (validatedFiles.length > 0) {
            const newFiles = multiple
                ? [...selectedFiles, ...validatedFiles]
                : validatedFiles;
            setSelectedFiles(newFiles);

            // Notify parent component
            if (onFileSelect) {
                onFileSelect(multiple ? newFiles : validatedFiles[0]);
            }
        }

        setErrors(allErrors);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const removeFile = (fileId) => {
        const newFiles = selectedFiles.filter(f => f.id !== fileId);
        setSelectedFiles(newFiles);

        if (onFileSelect) {
            onFileSelect(multiple ? newFiles : null);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="file-uploader">
            <div
                className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click or drag files to upload"
                onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInput}
                    accept={acceptedTypes.join(',')}
                    multiple={multiple}
                    style={{ display: 'none' }}
                    aria-hidden="true"
                />

                <div className="upload-icon">
                    <Upload size={48} weight="light" />
                </div>

                <h4>Drag & drop files here</h4>
                <p>or click to browse</p>

                <div className="upload-info">
                    <span>Accepted: PDF, DOC, DOCX, JPG, PNG</span>
                    <span>Max size: {formatBytes(maxSize)}</span>
                </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="selected-files">
                    <h5>Selected Files ({selectedFiles.length})</h5>
                    {selectedFiles.map((fileItem) => (
                        <div key={fileItem.id} className="file-item">
                            <div className="file-icon">
                                <File size={24} weight="fill" />
                            </div>
                            <div className="file-info">
                                <span className="file-name">{fileItem.name}</span>
                                <span className="file-size">{formatBytes(fileItem.size)}</span>
                            </div>
                            {fileItem.status === 'ready' && (
                                <CheckCircle size={20} weight="fill" className="status-icon success" />
                            )}
                            <button
                                onClick={() => removeFile(fileItem.id)}
                                className="remove-file-btn"
                                aria-label={`Remove ${fileItem.name}`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Validation Errors */}
            {errors.length > 0 && (
                <div className="upload-errors" role="alert" aria-live="polite">
                    <WarningCircle size={20} weight="fill" />
                    <div>
                        {errors.map((error, index) => (
                            <div key={index} className="error-item">
                                <strong>{error.fileName}:</strong> {error.errors.join(', ')}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
