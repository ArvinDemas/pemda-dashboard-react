/**
 * Notes Service
 * API calls for note management
 */

import api from './api';

/**
 * Get notes with pagination and filters
 */
export const getNotes = async (params = {}) => {
    const response = await api.get('/api/notes', { params });
    return response.data;
};

/**
 * Get single note by ID
 */
export const getNoteById = async (id) => {
    const response = await api.get(`/api/notes/${id}`);
    return response.data;
};

/**
 * Create new note
 */
export const createNote = async (noteData) => {
    const response = await api.post('/api/notes', noteData);
    return response.data;
};

/**
 * Update note
 */
export const updateNote = async (id, noteData) => {
    const response = await api.put(`/api/notes/${id}`, noteData);
    return response.data;
};

/**
 * Delete note
 */
export const deleteNote = async (id) => {
    const response = await api.delete(`/api/notes/${id}`);
    return response.data;
};

/**
 * Get notes statistics
 */
export const getNotesStats = async () => {
    const response = await api.get('/api/notes/stats');
    return response.data;
};

const notesService = {
    getNotes,
    getNoteById,
    createNote,
    updateNote,
    deleteNote,
    getNotesStats,
};

export default notesService;
