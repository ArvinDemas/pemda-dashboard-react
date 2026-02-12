/**
 * Settings Page - Merged Profile + Security with Tabs
 * Pengaturan Akun: Edit Profile & Change Password
 */

import React, { useState, useEffect } from 'react';
import { User, Lock, CheckCircle, XCircle, Eye, EyeSlash } from 'phosphor-react';
import profileService from '../services/profileService';
import { showSuccess, showError } from '../hooks/useToast';
import Loading from '../components/shared/Loading';
import '../styles/Settings.css';

const Settings = ({ user }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);

    // Profile data
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        email: ''
    });

    // Password data
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // Password strength calculation
    const getPasswordStrength = (password) => {
        if (!password) return { score: 0, label: '', color: '' };
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
        score = Object.values(checks).filter(Boolean).length;
        if (score === 5) return { score: 5, label: 'Strong', color: '#10b981' };
        if (score >= 4) return { score: 4, label: 'Good', color: '#3b82f6' };
        if (score >= 3) return { score: 3, label: 'Fair', color: '#f59e0b' };
        if (score >= 2) return { score: 2, label: 'Weak', color: '#f59e0b' };
        return { score: 1, label: 'Very Weak', color: '#d97706' };
    };

    const passwordStrength = getPasswordStrength(passwordData.newPassword);

    const requirements = [
        { label: 'Minimal 8 karakter', met: passwordData.newPassword.length >= 8 },
        { label: 'Huruf besar (A-Z)', met: /[A-Z]/.test(passwordData.newPassword) },
        { label: 'Huruf kecil (a-z)', met: /[a-z]/.test(passwordData.newPassword) },
        { label: 'Angka (0-9)', met: /\d/.test(passwordData.newPassword) },
        { label: 'Karakter khusus (!@#$...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) },
    ];

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        if (user) {
            setProfileData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await profileService.updateProfile(profileData);
            showSuccess('Profil berhasil diperbarui');
        } catch (error) {
            showError(error.response?.data?.message || 'Gagal memperbarui profil');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordStrength.score < 4) {
            showError('Password belum cukup kuat. Pastikan memenuhi minimal 4 dari 5 kriteria.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showError('Password baru tidak cocok');
            return;
        }

        setLoading(true);

        try {
            await profileService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            showSuccess('Password berhasil diubah');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            showError(error.response?.data?.message || 'Gagal mengubah password');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = () => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        return user?.username?.[0]?.toUpperCase() || 'U';
    };

    if (loading) return <Loading />;

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Pengaturan Akun</h1>
                <p>Kelola informasi profil dan keamanan Anda</p>
            </div>

            {/* Tabs */}
            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <User size={20} />
                    Edit Profil
                </button>
                <button
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    <Lock size={20} />
                    Ubah Password
                </button>
            </div>

            {/* Tab Content */}
            <div className="settings-content">
                {activeTab === 'profile' && (
                    <div className="tab-panel">
                        <div className="profile-avatar-section">
                            <div className="avatar-large">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" />
                                ) : (
                                    <div className="avatar-placeholder-large">{getInitials()}</div>
                                )}
                            </div>
                            <button className="change-avatar-btn">Ubah Foto</button>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="settings-form">
                            <div className="form-group">
                                <label htmlFor="firstName">Nama Depan</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={profileData.firstName}
                                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                                    placeholder="Masukkan nama depan"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="lastName">Nama Belakang</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    value={profileData.lastName}
                                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                                    placeholder="Masukkan nama belakang"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    placeholder="Masukkan email"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="tab-panel">
                        <div className="security-notice">
                            <Lock size={24} />
                            <div>
                                <h3>Keamanan Password</h3>
                                <p>Pastikan password Anda minimal 8 karakter dan kombinasi huruf, angka, dan simbol</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="settings-form">
                            <div className="form-group">
                                <label htmlFor="currentPassword">Password Saat Ini</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        id="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        placeholder="Masukkan password saat ini"
                                        required
                                    />
                                    <button type="button" className="password-toggle-btn" onClick={() => togglePasswordVisibility('current')}>
                                        {showPasswords.current ? <EyeSlash size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">Password Baru</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        id="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Masukkan password baru"
                                        required
                                    />
                                    <button type="button" className="password-toggle-btn" onClick={() => togglePasswordVisibility('new')}>
                                        {showPasswords.new ? <EyeSlash size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Password Strength Bar */}
                                {passwordData.newPassword && (
                                    <div className="password-strength" style={{ marginTop: '10px' }}>
                                        <div className="strength-bar" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div
                                                className="strength-fill"
                                                style={{
                                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                                    height: '100%',
                                                    backgroundColor: passwordStrength.color,
                                                    borderRadius: '3px',
                                                    transition: 'width 0.3s ease, background-color 0.3s ease',
                                                }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: passwordStrength.color, fontWeight: '600', marginTop: '4px', display: 'block' }}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}

                                {/* Requirements Checklist */}
                                {passwordData.newPassword && (
                                    <div className="requirements-checklist" style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                                        {requirements.map((req, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                                {req.met ? (
                                                    <CheckCircle size={18} weight="fill" style={{ color: '#10b981', flexShrink: 0 }} />
                                                ) : (
                                                    <XCircle size={18} weight="fill" style={{ color: '#cbd5e1', flexShrink: 0 }} />
                                                )}
                                                <span style={{ color: req.met ? '#10b981' : '#94a3b8' }}>{req.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
                                <div className="input-with-toggle">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        id="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Konfirmasi password baru"
                                        required
                                    />
                                    <button type="button" className="password-toggle-btn" onClick={() => togglePasswordVisibility('confirm')}>
                                        {showPasswords.confirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading || passwordStrength.score < 4}>
                                {loading ? 'Mengubah...' : 'Ubah Password'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
