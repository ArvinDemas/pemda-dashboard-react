/**
 * Notes Page - Rich Text Editor with Card Layout
 * Notion-style notes with React Quill editor
 */

import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Plus, MagnifyingGlass, Trash, PencilSimple, X, Tag, Folder, Export, FileText, FileCode, Eye } from 'phosphor-react';
import notesService from '../services/notesService';
import Loading from '../components/shared/Loading';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { showSuccess, showError } from '../hooks/useToast';
import '../styles/Notes.css';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form data
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    category: 'Personal',
    tags: '',
  });

  // React Quill modules configuration
  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link'
  ];

  useEffect(() => {
    loadNotes();
    loadStats();
  }, [currentPage, selectedCategory, searchQuery]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery || undefined,
      };

      const data = await notesService.getNotes(params);
      setNotes(data.notes || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      showError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await notesService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();

    if (!noteForm.title.trim()) {
      showError('Title is required');
      return;
    }

    try {
      const noteData = {
        title: noteForm.title,
        content: noteForm.content,
        category: noteForm.category,
        tags: noteForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      if (editingNote) {
        await notesService.updateNote(editingNote._id, noteData);
        showSuccess('Note updated successfully');
      } else {
        await notesService.createNote(noteData);
        showSuccess('Note created successfully');
      }

      setShowNoteModal(false);
      resetForm();
      loadNotes();
      loadStats();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save note');
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      content: note.content || '',
      category: note.category,
      tags: note.tags?.join(', ') || '',
    });
    setShowNoteModal(true);
  };

  const handleDeleteNote = async () => {
    try {
      await notesService.deleteNote(deleteConfirm._id);
      showSuccess('Note deleted successfully');
      setDeleteConfirm(null);
      loadNotes();
      loadStats();
    } catch (error) {
      showError('Failed to delete note');
    }
  };

  const resetForm = () => {
    setNoteForm({
      title: '',
      content: '',
      category: 'Personal',
      tags: '',
    });
    setEditingNote(null);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // Export note as Markdown
  const exportAsMarkdown = (note) => {
    const stripHtml = (html) => {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    const markdown = `# ${note.title}\n\n${stripHtml(note.content)}\n\n---\n**Category**: ${note.category}\n**Tags**: ${note.tags?.join(', ') || 'None'}\n**Created**: ${new Date(note.createdAt).toLocaleString()}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('Note exported as Markdown');
  };

  // Export note as HTML
  const exportAsHTML = (note) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${note.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    .meta { color: #666; font-size: 0.9em; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="content">${note.content}</div>
  <div class="meta">
    <p><strong>Category:</strong> ${note.category}</p>
    <p><strong>Tags:</strong> ${note.tags?.join(', ') || 'None'}</p>
    <p><strong>Created:</strong> ${new Date(note.createdAt).toLocaleString()}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess('Note exported as HTML');
  };

  // Strip HTML for preview
  const stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getCategoryColor = (category) => {
    const colors = {
      Personal: '#8b5cf6',
      Work: '#0ea5e9',
      Ideas: '#f59e0b',
      Todo: '#10b981',
    };
    return colors[category] || '#64748b';
  };

  if (loading && notes.length === 0) {
    return <Loading />;
  }

  return (
    <div className="notes-page page-wrapper">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-header-left">
          <h2>Catatan</h2>
          <p>{stats?.total || 0} catatan total</p>
        </div>
        <button className="btn-primary" onClick={() => {
          resetForm();
          setShowNoteModal(true);
        }}>
          <Plus size={20} weight="bold" />
          Buat Catatan Baru
        </button>
      </div>

      {/* Filters & Search */}
      <div className="notes-filters">
        <div className="search-box">
          <MagnifyingGlass size={20} />
          <input
            type="text"
            placeholder="Cari catatan..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="category-filters">
          {['all', 'Personal', 'Work', 'Ideas', 'Todo'].map(cat => (
            <button
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
            >
              {cat === 'all' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid - Card Layout */}
      <div className="notes-grid">
        {notes.map(note => (
          <div key={note._id} className="note-card">
            <div className="note-card-header">
              <span
                className="note-category-badge"
                style={{ backgroundColor: `${getCategoryColor(note.category)}20`, color: getCategoryColor(note.category) }}
              >
                <Folder size={14} weight="fill" />
                {note.category}
              </span>
              <div className="note-card-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => { e.stopPropagation(); setPreviewNote(note); setShowPreviewModal(true); }}
                  title="Lihat Preview"
                >
                  <Eye size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={(e) => { e.stopPropagation(); exportAsMarkdown(note); }}
                  title="Export as Markdown"
                >
                  <FileText size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={(e) => { e.stopPropagation(); exportAsHTML(note); }}
                  title="Export as HTML"
                >
                  <FileCode size={18} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => handleEditNote(note)}
                  title="Edit"
                >
                  <PencilSimple size={18} />
                </button>
                <button
                  className="icon-btn delete"
                  onClick={() => setDeleteConfirm(note)}
                  title="Delete"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>

            <h3 className="note-card-title">{note.title}</h3>

            <div className="note-card-content">
              {stripHtml(note.content || '').substring(0, 150)}
              {stripHtml(note.content || '').length > 150 && '...'}
            </div>

            {note.tags && note.tags.length > 0 && (
              <div className="note-card-tags">
                {note.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="note-tag">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="note-tag">+{note.tags.length - 3}</span>
                )}
              </div>
            )}

            <div className="note-card-footer">
              <span className="note-date">
                {new Date(note.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {notes.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>Belum ada catatan</h3>
          <p>Mulai dengan membuat catatan pertama Anda</p>
          <button className="btn-primary" onClick={() => setShowNoteModal(true)}>
            <Plus size={20} />
            Buat Catatan
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingNote ? 'Edit Catatan' : 'Buat Catatan Baru'}</h3>
              <button className="icon-btn" onClick={() => setShowNoteModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveNote}>
              <div className="form-group">
                <label>Judul *</label>
                <input
                  type="text"
                  className="form-input"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="Masukkan judul catatan..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Konten</label>
                <ReactQuill
                  theme="snow"
                  value={noteForm.content}
                  onChange={(content) => setNoteForm({ ...noteForm, content })}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Tulis catatan Anda di sini..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    className="form-select"
                    value={noteForm.category}
                    onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Ideas">Ideas</option>
                    <option value="Todo">Todo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tags (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={noteForm.tags}
                    onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNoteModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {editingNote ? 'Update' : 'Simpan'} Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewNote && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>Preview: {previewNote.title}</h3>
              <button className="icon-btn" onClick={() => setShowPreviewModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {/* Category Badge */}
              <div style={{ marginBottom: '16px' }}>
                <span
                  className="note-category-badge"
                  style={{ backgroundColor: `${getCategoryColor(previewNote.category)}20`, color: getCategoryColor(previewNote.category) }}
                >
                  <Folder size={14} weight="fill" />
                  {previewNote.category}
                </span>
              </div>

              {/* Content */}
              <div
                className="note-preview-content"
                style={{
                  padding: '20px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  minHeight: '200px'
                }}
                dangerouslySetInnerHTML={{ __html: previewNote.content || '<p style="color: #94a3b8;">Tidak ada konten</p>' }}
              />

              {/* Tags */}
              {previewNote.tags && previewNote.tags.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '8px' }}>Tags:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {previewNote.tags.map((tag, idx) => (
                      <span key={idx} className="note-tag">
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                <p><strong>Dibuat:</strong> {new Date(previewNote.createdAt).toLocaleString('id-ID')}</p>
                {previewNote.updatedAt && previewNote.updatedAt !== previewNote.createdAt && (
                  <p><strong>Terakhir diupdate:</strong> {new Date(previewNote.updatedAt).toLocaleString('id-ID')}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => exportAsMarkdown(previewNote)}>
                  <FileText size={18} />
                  Export MD
                </button>
                <button className="btn-secondary" onClick={() => exportAsHTML(previewNote)}>
                  <FileCode size={18} />
                  Export HTML
                </button>
                <button className="btn-primary" onClick={() => { handleEditNote(previewNote); setShowPreviewModal(false); }}>
                  <PencilSimple size={18} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Hapus Catatan"
          message={`Apakah Anda yakin ingin menghapus catatan "${deleteConfirm.title}"?`}
          onConfirm={handleDeleteNote}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Notes;
