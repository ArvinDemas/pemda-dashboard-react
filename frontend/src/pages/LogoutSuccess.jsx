/**
 * Logout Success Page
 * Clean design matching dashboard theme
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, SignIn } from 'phosphor-react';
import '../styles/Pages.css';

function LogoutSuccess() {
  const navigate = useNavigate();

  const handleLoginAgain = () => {
    navigate('/');
    window.location.reload(); // Force reload to trigger login
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Success Icon */}
        <div style={{ marginBottom: '1.5rem' }}>
          <CheckCircle size={80} weight="fill" color="#10b981" style={{
            animation: 'scaleIn 0.5s ease'
          }} />
        </div>

        {/* Title */}
        <h1 style={{
          marginBottom: '0.5rem',
          color: '#0f172a',
          fontSize: '1.75rem',
          fontWeight: '700'
        }}>
          Logout Berhasil
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1rem',
          color: '#64748b',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Anda telah berhasil keluar dari Dashboard Pemerintah Daerah Istimewa Yogyakarta
        </p>

        {/* Info Box */}
        <div style={{
          background: '#f1f5f9',
          padding: '1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{
            margin: '0',
            color: '#475569',
            fontSize: '0.95rem',
            lineHeight: '1.6'
          }}>
            ✅ Sesi Anda telah dihapus dengan aman<br />
            🔒 Terima kasih telah menggunakan layanan kami
          </p>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLoginAgain}
          style={{
            width: '100%',
            padding: '0.875rem',
            fontSize: '1rem',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
          }}
        >
          <SignIn size={20} weight="bold" />
          Login Kembali
        </button>

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <img
            src="https://jogjaprov.go.id/storage/files/shares/page/1518066730_2d84b769e3cc9d6f06f8c91a6c3e285c.jpg"
            alt="Logo DIY"
            style={{ width: '24px', height: '24px', borderRadius: '4px' }}
          />
          <p style={{
            margin: 0,
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            © 2026 Pemerintah Daerah Istimewa Yogyakarta
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { 
            transform: scale(0);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default LogoutSuccess;
