/**
 * Settings Page - Merged Profile + Security with Tabs
 * Pengaturan Akun: Edit Profile & Change Password
 */

import React, { useState, useEffect } from 'react';
import { User, Lock } from 'phosphor-react';
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

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showError('Password baru tidak cocok');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            showError('Password minimal 8 karakter');
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
                                <input
                                    type="password"
                                    id="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    placeholder="Masukkan password saat ini"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">Password Baru</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Masukkan password baru"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Konfirmasi Password Baru</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Konfirmasi password baru"
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
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
