/**
 * Documents Service
 * API calls for document upload and management
 */

import api, { uploadFile, downloadFile } from './api';

/**
 * Upload document with progress tracking
 */
export const uploadDocument = async (file, onProgress, parentFolderId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (parentFolderId) {
        formData.append('parentFolderId', parentFolderId);
    }
    return uploadFile('/api/documents/upload', file, onProgress);
};

/**
 * Get documents with pagination (legacy - kept for compatibility)
 */
export const getDocuments = async (params = {}) => {
    const response = await api.get('/api/documents', { params });
    return response.data;
};

/**
 * Get folder contents
 */
export const getFolderContents = async (folderId, params = {}) => {
    const response = await api.get(`/api/documents/folder/${folderId}`, { params });
    return response.data;
};

/**
 * Create folder
 */
export const createFolder = async (name, parentFolderId = null) => {
    const response = await api.post('/api/documents/folder', {
        name,
        parentFolderId
    });
    return response.data;
};

/**
 * Rename file or folder
 */
export const renameItem = async (id, newName) => {
    const response = await api.put(`/api/documents/${id}/rename`, { newName });
    return response.data;
};

/**
 * Download document
 */
export const downloadDocument = async (id, filename) => {
    return downloadFile(`/api/documents/${id}/download`, filename);
};

/**
 * Delete document or folder
 */
export const deleteDocument = async (id) => {
    const response = await api.delete(`/api/documents/${id}`);
    return response.data;
};

/**
 * Get documents statistics (alias for consistency)
 */
export const getDocumentsStats = async () => {
    const response = await api.get('/api/documents/stats');
    return response.data;
};

export const getStats = getDocumentsStats;

const documentsService = {
    uploadDocument,
    getDocuments,
    getFolderContents,
    createFolder,
    renameItem,
    downloadDocument,
    deleteDocument,
    getDocumentsStats,
    getStats,
};

export default documentsService;
