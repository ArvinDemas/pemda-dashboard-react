/**
 * User Management Page (Super Admin)
 * Comprehensive user administration with identity provider display
 */

import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlass, User, PencilSimple, X, CheckCircle, XCircle,
    Clock, Shield, Trash, Key, Eye, EyeSlash, GoogleLogo, GithubLogo, FacebookLogo,
    IdentificationCard, Plus, UserPlus
} from 'phosphor-react';
import api from '../services/api';
import Loading from '../components/shared/Loading';
import toast from 'react-hot-toast';
import '../styles/UserManagement.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);

    // Modal states
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
    });
    const [userForm, setUserForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        enabled: true,
        emailVerified: false,
    });

    // Password strength for create form
    const getPasswordStrength = (password) => {
        if (!password) return { score: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        if (score === 5) return { score: 5, label: 'Strong', color: '#10b981' };
        if (score >= 4) return { score: 4, label: 'Good', color: '#3b82f6' };
        if (score >= 3) return { score: 3, label: 'Fair', color: '#f59e0b' };
        if (score >= 2) return { score: 2, label: 'Weak', color: '#f59e0b' };
        return { score: 1, label: 'Very Weak', color: '#d97706' };
    };

    const createPasswordStrength = getPasswordStrength(createForm.password);
    const createRequirements = [
        { label: 'Minimal 8 karakter', met: createForm.password.length >= 8 },
        { label: 'Huruf besar (A-Z)', met: /[A-Z]/.test(createForm.password) },
        { label: 'Huruf kecil (a-z)', met: /[a-z]/.test(createForm.password) },
        { label: 'Angka (0-9)', met: /\d/.test(createForm.password) },
        { label: 'Karakter khusus (!@#$...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(createForm.password) },
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        // Filter users based on search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filtered = users.filter(user =>
                user.username?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.firstName?.toLowerCase().includes(query) ||
                user.lastName?.toLowerCase().includes(query)
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchQuery, users]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/users');
            setUsers(response.data.users || []);
            setFilteredUsers(response.data.users || []);
        } catch (error) {
            toast.error('Gagal memuat data pengguna');
            console.error('Load users error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (user) => {
        try {
            const response = await api.get(`/api/admin/users/${user.id}`);
            setSelectedUser(response.data);
            setShowDetailModal(true);
        } catch (error) {
            toast.error('Gagal memuat detail user');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast.error('Password minimal 8 karakter');
            return;
        }

        try {
            await api.put(`/api/admin/users/${selectedUser.id}/reset-password`, {
                newPassword: newPassword
            });
            toast.success(`Password untuk ${selectedUser.username} berhasil direset`);
            setShowResetPasswordModal(false);
            setNewPassword('');
            setSelectedUser(null);
        } catch (error) {
            toast.error('Gagal reset password');
        }
    };

    const handleDeleteUser = async () => {
        try {
            const response = await api.delete(`/api/admin/users/${selectedUser.id}`);
            toast.success(
                `User ${selectedUser.username} dan ${response.data.deletedData.documents} dokumen, ${response.data.deletedData.notes} catatan berhasil dihapus`
            );
            setShowDeleteConfirm(false);
            setSelectedUser(null);
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menghapus user');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!createForm.username || !createForm.email || !createForm.password) {
            toast.error('Username, email, dan password wajib diisi');
            return;
        }
        if (createPasswordStrength.score < 4) {
            toast.error('Password belum cukup kuat (minimal 4 dari 5 kriteria)');
            return;
        }
        try {
            setCreating(true);
            await api.post('/api/admin/users', createForm);
            toast.success(`User ${createForm.username} berhasil dibuat!`);
            setShowCreateModal(false);
            setCreateForm({ username: '', email: '', firstName: '', lastName: '', password: '' });
            loadUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal membuat user');
        } finally {
            setCreating(false);
        }
    };

    const getProviderIcon = (provider) => {
        switch (provider?.toLowerCase()) {
            case 'google':
                return <GoogleLogo size={16} weight="bold" />;
            case 'github':
                return <GithubLogo size={16} weight="bold" />;
            case 'facebook':
                return <FacebookLogo size={16} weight="bold" />;
            default:
                return <IdentificationCard size={16} weight="bold" />;
        }
    };

    const getProviderBadge = (provider) => {
        const colors = {
            google: { bg: '#fef3c7', color: '#92400e' },
            github: { bg: '#f3f4f6', color: '#1f2937' },
            facebook: { bg: '#dbeafe', color: '#1e40af' },
            keycloak: { bg: '#ede9fe', color: '#5b21b6' }
        };
        const style = colors[provider?.toLowerCase()] || colors.keycloak;
        return (
            <span className="provider-badge" style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                {getProviderIcon(provider)}
                <span>{provider || 'Keycloak'}</span>
            </span>
        );
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="user-management-page page-wrapper">
            {/* Header */}
            <div className="user-header">
                <div className="user-header-left">
                    <h2>User Management</h2>
                    <p>{users.length} total users</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <UserPlus size={20} weight="bold" />
                    Buat Akun Baru
                </button>
            </div>

            {/* Search */}
            <div className="user-search">
                <MagnifyingGlass size={20} />
                <input
                    type="text"
                    placeholder="Search users by name, email, or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Users Table */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Provider</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar">
                                            {user.firstName?.[0] || user.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="user-info">
                                            <div className="user-name">
                                                {user.firstName || user.lastName
                                                    ? `${user.firstName} ${user.lastName}`.trim()
                                                    : user.username}
                                            </div>
                                            <div className="user-username">@{user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{user.email || 'N/A'}</td>
                                <td>{getProviderBadge(user.identityProvider)}</td>
                                <td>
                                    <span className={`status-badge ${user.enabled ? 'active' : 'inactive'}`}>
                                        {user.enabled ? (
                                            <>
                                                <CheckCircle size={14} weight="fill" />
                                                Aktif
                                            </>
                                        ) : (
                                            <>
                                                <XCircle size={14} weight="fill" />
                                                Nonaktif
                                            </>
                                        )}
                                    </span>
                                </td>
                                <td className="date-cell">{formatDate(user.createdTimestamp)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="icon-btn" onClick={() => handleViewDetails(user)} title="Detail">
                                            <Eye size={18} />
                                        </button>
                                        <button className="icon-btn" onClick={() => { setSelectedUser(user); setShowResetPasswordModal(true); }} title="Reset Password" style={{ color: '#f59e0b' }}>
                                            <Key size={18} />
                                        </button>
                                        <button className="icon-btn" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }} title="Hapus" style={{ color: '#d97706' }}>
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="empty-table">
                        <User size={48} color="#cbd5e1" />
                        <p>No users found</p>
                    </div>
                )}
            </div>


            {/* Detail Modal */}
            {showDetailModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detail Pengguna</h3>
                            <button className="icon-btn" onClick={() => setShowDetailModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <div className="user-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', margin: '0 auto 16px' }}>
                                    {selectedUser.displayName?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <h3>{selectedUser.displayName || selectedUser.username}</h3>
                                <p style={{ color: '#64748b' }}>{selectedUser.email}</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#64748b' }}>Metode Login</h4>
                                {getProviderBadge(selectedUser.identityProvider)}
                            </div>

                            {selectedUser.stats && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#64748b' }}>Statistik</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>{selectedUser.stats.documents}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Dokumen</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>{selectedUser.stats.notes}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Catatan</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>{selectedUser.activeSessions || 0}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Sesi</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#64748b' }}>Informasi Akun</h4>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ color: '#64748b' }}>Status</span>
                                        <span className={`status-badge ${selectedUser.enabled ? 'active' : 'inactive'}`}>
                                            {selectedUser.enabled ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ color: '#64748b' }}>Email Verified</span>
                                        <span>{selectedUser.emailVerified ? '✅ Ya' : '⏳ Belum'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                        <span style={{ color: '#64748b' }}>Dibuat</span>
                                        <span>{formatDate(selectedUser.createdTimestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reset Password</h3>
                            <button className="icon-btn" onClick={() => setShowResetPasswordModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>
                                Atur password baru untuk <strong>{selectedUser.username}</strong>
                            </p>

                            <div className="form-group">
                                <label>Password Baru</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="Minimal 8 karakter"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button
                                    className="btn-secondary"
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                                    onClick={() => setShowResetPasswordModal(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={handleResetPassword}
                                    disabled={!newPassword || newPassword.length < 8}
                                >
                                    <Key size={18} />
                                    Reset Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Konfirmasi Hapus</h3>
                            <button className="icon-btn" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Trash size={64} color="#d97706" style={{ marginBottom: '16px' }} />
                                <p style={{ marginBottom: '12px', color: '#64748b' }}>
                                    Anda akan <strong style={{ color: '#d97706' }}>menghapus permanen</strong>  user:
                                </p>
                                <h4 style={{ marginBottom: '16px', color: '#0f172a' }}>{selectedUser.displayName || selectedUser.username}</h4>
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
                                    <p style={{ color: '#92400e', fontSize: '0.9rem', fontWeight: '600' }}>
                                        ⚠️ Semua dokumen dan catatan milik user ini akan ikut terhapus!
                                    </p>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button
                                    className="btn-secondary"
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={handleDeleteUser}
                                >
                                    <Trash size={18} />
                                    Hapus Permanen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Buat Akun Baru</h3>
                            <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleCreateUser}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div className="form-group">
                                        <label>Nama Depan</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nama depan"
                                            value={createForm.firstName}
                                            onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Nama Belakang</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nama belakang"
                                            value={createForm.lastName}
                                            onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Username *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="username"
                                        value={createForm.username}
                                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="user@example.com"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Password *</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type={showCreatePassword ? 'text' : 'password'}
                                            className="form-input"
                                            style={{ paddingRight: '48px', width: '100%' }}
                                            placeholder="Minimal 8 karakter"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                                            style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                        >
                                            {showCreatePassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Strength Bar */}
                                    {createForm.password && (
                                        <div style={{ marginTop: '10px' }}>
                                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(createPasswordStrength.score / 5) * 100}%`,
                                                    height: '100%',
                                                    backgroundColor: createPasswordStrength.color,
                                                    borderRadius: '3px',
                                                    transition: 'width 0.3s ease, background-color 0.3s ease',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: createPasswordStrength.color, fontWeight: '600', marginTop: '4px', display: 'block' }}>
                                                {createPasswordStrength.label}
                                            </span>
                                        </div>
                                    )}

                                    {/* Requirements */}
                                    {createForm.password && (
                                        <div style={{ marginTop: '12px', display: 'grid', gap: '4px' }}>
                                            {createRequirements.map((req, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                                    {req.met
                                                        ? <CheckCircle size={16} weight="fill" style={{ color: '#10b981', flexShrink: 0 }} />
                                                        : <XCircle size={16} weight="fill" style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                                                    <span style={{ color: req.met ? '#10b981' : '#94a3b8' }}>{req.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                    <button
                                        type="button"
                                        style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || createPasswordStrength.score < 4}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: creating || createPasswordStrength.score < 4 ? '#94a3b8' : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                            color: 'white',
                                            cursor: creating || createPasswordStrength.score < 4 ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontWeight: '600',
                                        }}
                                    >
                                        <UserPlus size={18} />
                                        {creating ? 'Membuat...' : 'Buat Akun'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
