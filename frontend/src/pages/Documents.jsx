/**
 * Documents Page - Folder-based File Manager
 * Google Drive-style document management with folders
 */

import React, { useState, useEffect } from 'react';
import {
  FileArrowUp, FilePdf, FileDoc, File as FileIcon, Download, Trash,
  MagnifyingGlass, Folder, FolderOpen, Plus, PencilSimple, X, CaretRight, House, Eye
} from 'phosphor-react';
import documentsService from '../services/documentsService';
import FileUploader from '../components/shared/FileUploader';
import Loading from '../components/shared/Loading';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { showSuccess, showError } from '../hooks/useToast';
import '../styles/Documents.css';

const Documents = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Root' }]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [renamingItem, setRenamingItem] = useState(null);
  const [newName, setNewName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    loadFolderContents();
    loadStats();
  }, [currentFolderId, currentPage]);

  const loadFolderContents = async () => {
    try {
      setLoading(true);
      const folderId = currentFolderId || 'root';
      const data = await documentsService.getFolderContents(folderId, { page: currentPage, limit });

      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || [{ id: null, name: 'Root' }]);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      showError('Failed to load folder contents');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await documentsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  // Navigate into folder
  const handleFolderClick = (folderId) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  // Navigate via breadcrumb
  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  // Create new folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      showError('Folder name is required');
      return;
    }

    try {
      await documentsService.createFolder(newFolderName, currentFolderId);
      showSuccess('Folder created successfully');
      setShowCreateFolderModal(false);
      setNewFolderName('');
      loadFolderContents();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to create folder');
    }
  };

  // Rename item
  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      showError('Name is required');
      return;
    }

    try {
      await documentsService.renameItem(renamingItem.id, newName);
      showSuccess(`${renamingItem.type === 'folder' ? 'Folder' : 'File'} renamed successfully`);
      setShowRenameModal(false);
      setRenamingItem(null);
      setNewName('');
      loadFolderContents();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to rename item');
    }
  };

  const openRenameModal = (item) => {
    setRenamingItem(item);
    setNewName(item.originalName);
    setShowRenameModal(true);
  };

  // File upload
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('Please select a file');
      return;
    }

    setUploading(true);
    try {
      await documentsService.uploadDocument(
        selectedFile.file,
        (progress) => setUploadProgress(progress),
        currentFolderId // Upload to current folder
      );

      showSuccess('Document uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadProgress(0);
      loadFolderContents();
      loadStats();
    } catch (error) {
      showError(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // File download
  const handleDownload = async (doc) => {
    try {
      await documentsService.downloadDocument(doc.id, doc.originalName);
      showSuccess('Download started');
    } catch (error) {
      showError('Failed to download document');
    }
  };

  // Delete item
  const handleDelete = async () => {
    try {
      await documentsService.deleteDocument(deleteConfirm.id);
      showSuccess(`${deleteConfirm.type === 'folder' ? 'Folder' : 'Document'} deleted successfully`);
      setDeleteConfirm(null);
      loadFolderContents();
      loadStats();
    } catch (error) {
      showError('Failed to delete item');
    }
  };

  // Preview document
  const handlePreview = async (doc) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
  };

  const canPreview = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    const previewable = [
      'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      'txt', 'md', 'json', 'xml', 'csv'
    ];
    return previewable.includes(ext);
  };

  const getPreviewUrl = (docId) => {
    return `/api/documents/${docId}/download`;
  };

  // Get file icon
  const getFileIcon = (item) => {
    if (item.type === 'folder' || item.isFolder) {
      return <Folder size={32} weight="fill" color="#f59e0b" />;
    }

    const ext = item.originalName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FilePdf size={32} weight="fill" color="#3b82f6" />;
    if (['doc', 'docx'].includes(ext)) return <FileDoc size={32} weight="fill" color="#3b82f6" />;
    return <FileIcon size={32} weight="fill" color="#64748b" />;
  };

  if (loading && items.length === 0) {
    return <Loading />;
  }

  return (
    <div className="documents-page page-wrapper">
      {/* Header */}
      <div className="documents-header">
        <div className="documents-header-left">
          <h2>Dokumen</h2>
          <p>{stats?.total || 0} file total</p>
        </div>
        <div className="documents-header-actions">
          <button className="btn-secondary" onClick={() => setShowCreateFolderModal(true)}>
            <Folder size={20} weight="fill" />
            Buat Folder
          </button>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <FileArrowUp size={20} weight="bold" />
            Upload Dokumen
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-nav">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id || 'root'}>
            <button
              className={`breadcrumb-item ${crumb.id === currentFolderId ? 'active' : ''}`}
              onClick={() => handleBreadcrumbClick(crumb.id)}
            >
              {index === 0 ? <House size={16} weight="fill" /> : null}
              {crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && <CaretRight size={14} className="breadcrumb-sep" />}
          </React.Fragment>
        ))}
      </div>

      {/* Items Grid */}
      <div className="documents-grid">
        {items.map(item => (
          <div
            key={item.id}
            className="document-card"
            onDoubleClick={() => item.type === 'folder' && handleFolderClick(item.id)}
          >
            <div className="document-card-icon">
              {getFileIcon(item)}
            </div>

            <div className="document-card-content">
              <h4 className="document-name">{item.originalName}</h4>
              {item.type === 'file' && (
                <p className="document-info">
                  {item.readableSize} • {new Date(item.uploadedAt).toLocaleDateString('id-ID')}
                </p>
              )}
              {item.type === 'folder' && (
                <p className="document-info">Folder</p>
              )}
            </div>

            <div className="document-card-actions">
              {item.type === 'file' && (
                <>
                  {canPreview(item.originalName) && (
                    <button
                      className="icon-btn"
                      onClick={() => handlePreview(item)}
                      title="Preview"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  <button
                    className="icon-btn"
                    onClick={() => handleDownload(item)}
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                </>
              )}
              <button
                className="icon-btn"
                onClick={() => openRenameModal(item)}
                title="Rename"
              >
                <PencilSimple size={18} />
              </button>
              <button
                className="icon-btn delete"
                onClick={() => setDeleteConfirm(item)}
                title="Delete"
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <FolderOpen size={64} color="#cbd5e1" />
          </div>
          <h3>Folder kosong</h3>
          <p>Upload dokumen atau buat folder baru untuk memulai</p>
          <div className="empty-actions">
            <button className="btn-secondary" onClick={() => setShowCreateFolderModal(true)}>
              <Folder size={20} />
              Buat Folder
            </button>
            <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
              <FileArrowUp size={20} />
              Upload Dokumen
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Folder Baru</h3>
              <button className="icon-btn" onClick={() => setShowCreateFolderModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Folder *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Masukkan nama folder..."
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateFolderModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ubah Nama {renamingItem?.type === 'folder' ? 'Folder' : 'File'}</h3>
              <button className="icon-btn" onClick={() => setShowRenameModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRename}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Baru *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Masukkan nama baru..."
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRenameModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Dokumen</h3>
              <button className="icon-btn" onClick={() => !uploading && setShowUploadModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <FileUploader onFileSelect={handleFileSelect} />

              {uploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p>{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewDocument && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>{previewDocument.originalName}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="icon-btn"
                  onClick={() => handleDownload(previewDocument)}
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button className="icon-btn" onClick={() => setShowPreviewModal(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: 0, maxHeight: '70vh', overflow: 'auto' }}>
              {(() => {
                const ext = previewDocument.originalName?.split('.').pop()?.toLowerCase();
                const url = getPreviewUrl(previewDocument.id);

                // Images
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                  return (
                    <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc' }}>
                      <img
                        src={url}
                        alt={previewDocument.originalName}
                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                      />
                    </div>
                  );
                }

                // PDF
                if (ext === 'pdf') {
                  return (
                    <iframe
                      src={url}
                      title={previewDocument.originalName}
                      style={{ width: '100%', height: '70vh', border: 'none' }}
                    />
                  );
                }

                // Text files
                if (['txt', 'md', 'json', 'xml', 'csv'].includes(ext)) {
                  return (
                    <div style={{ padding: '20px' }}>
                      <iframe
                        src={url}
                        title={previewDocument.originalName}
                        style={{ width: '100%', height: '60vh', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </div>
                  );
                }

                // Fallback
                return (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <FileIcon size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <p style={{ color: '#64748b', marginBottom: '16px' }}>Preview tidak tersedia untuk file jenis ini</p>
                    <button className="btn-primary" onClick={() => handleDownload(previewDocument)}>
                      <Download size={18} />
                      Download untuk melihat
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title={`Hapus ${deleteConfirm.type === 'folder' ? 'Folder' : 'Dokumen'}`}
          message={`Apakah Anda yakin ingin menghapus "${deleteConfirm.originalName}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default Documents;
