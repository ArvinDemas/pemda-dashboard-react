/**
 * Profile Page
 * User profile management with name and email editing
 * Following frontend-developer and ui-ux-pro-max patterns
 */

import React, { useState, useEffect } from 'react';
import { User, Envelope, CheckCircle } from 'phosphor-react';
import profileService from '../services/profileService';
import Loading from '../components/shared/Loading';
import { showSuccess, showError, showPromise } from '../hooks/useToast';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
      });
    } catch (error) {
      showError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showError('Please fix the errors before submitting');
      return;
    }

    setSaving(true);
    try {
      const updatePromise = profileService.updateProfile(formData);

      await showPromise(updatePromise, {
        loading: 'Updating profile...',
        success: 'Profile updated successfully!',
        error: 'Failed to update profile',
      });

      // Reload profile to get updated data
      await loadProfile();
      setHasChanges(false);
    } catch (error) {
      // Error already shown by toast
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
      });
      setErrors({});
      setHasChanges(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <div className="header-left">
          <h2>Profile Settings</h2>
          <p>Manage your personal information</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Profile Summary Card */}
        <div className="dashboard-card profile-summary">
          <div className="profile-avatar-large">
            <User size={64} weight="fill" />
          </div>
          <h3>{profile?.displayName || 'User'}</h3>
          <p className="profile-email">{profile?.email}</p>
          {profile?.emailVerified && (
            <div className="verified-badge">
              <CheckCircle size={16} weight="fill" />
              <span>Email Verified</span>
            </div>
          )}
        </div>

        {/* Edit Profile Form */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Edit Profile</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="profile-form">
              {/* First Name */}
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="Enter your first name"
                  />
                </div>
                {errors.firstName && (
                  <span className="error-message">{errors.firstName}</span>
                )}
              </div>

              {/* Last Name */}
              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={20} className="input-icon" />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Enter your last name"
                  />
                </div>
                {errors.lastName && (
                  <span className="error-message">{errors.lastName}</span>
                )}
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Envelope size={20} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <span className="error-message">{errors.email}</span>
                )}
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary"
                  disabled={!hasChanges || saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!hasChanges || saving}
                >
                  {saving ? (
                    <>
                      <Loading size="small" variant="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Information */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Account Information</h3>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">User ID</span>
                <span className="info-value">{profile?.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Account Status</span>
                <span className="info-value">
                  {profile?.enabled ? (
                    <span className="status-badge active">Active</span>
                  ) : (
                    <span className="status-badge inactive">Inactive</span>
                  )}
                </span>
              </div>
              {profile?.createdTimestamp && (
                <div className="info-item">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">
                    {new Date(profile.createdTimestamp).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
