/**
 * Security Page
 * Password change with strength validation
 * Following frontend-developer and ui-ux-pro-max patterns
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeSlash, CheckCircle, XCircle } from 'phosphor-react';
import profileService from '../services/profileService';
import Loading from '../components/shared/Loading';
import { showSuccess, showError } from '../hooks/useToast';

const Security = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Password strength validation
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

  const passwordStrength = getPasswordStrength(formData.newPassword);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (passwordStrength.score < 4) {
      newErrors.newPassword = 'Password is not strong enough';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
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
      await profileService.changePassword(formData);
      showSuccess('Password changed successfully!');

      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    } catch (error) {
      showError(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  // Password requirements checklist
  const requirements = [
    { label: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(formData.newPassword) },
    { label: 'Contains number', met: /\d/.test(formData.newPassword) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) },
  ];

  return (
    <div className="security-page page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <h2>Security Settings</h2>
          <p>Manage your password and security preferences</p>
        </div>
      </div>

      <div className="security-content">
        {/* Change Password Form */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Change Password</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="security-form">
              {/* Current Password */}
              <div className="form-group">
                <label htmlFor="currentPassword">
                  Current Password <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className={errors.currentPassword ? 'error' : ''}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('current')}
                    aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.current ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <span className="error-message">{errors.currentPassword}</span>
                )}
              </div>

              {/* New Password */}
              <div className="form-group">
                <label htmlFor="newPassword">
                  New Password <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className={errors.newPassword ? 'error' : ''}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('new')}
                    aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.new ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <span className="error-message">{errors.newPassword}</span>
                )}

                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        }}
                      />
                    </div>
                    <span
                      className="strength-label"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm New Password <span className="required">*</span>
                </label>
                <div className="input-with-icon">
                  <Lock size={20} className="input-icon" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                    aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                  >
                    {showPasswords.confirm ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loading size="small" variant="white" />
                      <span>Changing Password...</span>
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Password Requirements</h3>
          </div>
          <div className="card-body">
            <div className="requirements-list">
              {requirements.map((req, index) => (
                <div key={index} className="requirement-item">
                  {req.met ? (
                    <CheckCircle size={20} weight="fill" className="req-icon met" />
                  ) : (
                    <XCircle size={20} weight="fill" className="req-icon unmet" />
                  )}
                  <span className={req.met ? 'met' : 'unmet'}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Tips */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Security Tips</h3>
          </div>
          <div className="card-body">
            <ul className="security-tips">
              <li>Use a unique password that you don't use elsewhere</li>
              <li>Avoid common words and personal information</li>
              <li>Consider using a password manager</li>
              <li>Change your password regularly</li>
              <li>Never share your password with anyone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
