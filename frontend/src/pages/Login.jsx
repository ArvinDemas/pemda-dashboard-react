import React from 'react';
import { SignIn } from 'phosphor-react';

const Login = ({ onLogin }) => {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img
              src="https://jogjaprov.go.id/storage/files/shares/page/1518066730_2d84b769e3cc9d6f06f8c91a6c3e285c.jpg"
              alt="Logo DIY"
              className="login-logo"
            />
            <h1>Portal Dashboard</h1>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Pemerintah Daerah</h2>
            <p style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>Daerah Istimewa Yogyakarta</p>
          </div>

          <div className="login-body">
            <button className="login-btn" onClick={onLogin}>
              <SignIn size={20} weight="bold" />
              <span>Login dengan Keycloak</span>
            </button>

            <p className="login-hint">
              Gunakan akun Keycloak Anda untuk mengakses dashboard
            </p>
          </div>

          <div className="login-footer">
            <p>© 2026 Pemerintah Daerah Istimewa Yogyakarta</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
