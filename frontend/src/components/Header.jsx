import React from 'react';
import { UserCircle } from 'phosphor-react';
import { useLocation } from 'react-router-dom';

const Header = ({ user }) => {
  const location = useLocation();

  const titles = {
    '/': 'Dashboard',
    '/profile': 'Profil Saya',
    '/security': 'Keamanan',
    '/sessions': 'Sesi Aktif',
    '/logs': 'Riwayat Login',
    '/documents': 'Dokumen',
    '/notes': 'Catatan'
  };

  const subtitles = {
    '/': `Selamat datang kembali, ${user?.firstName || 'User'}`,
    '/profile': 'Kelola informasi pribadi Anda',
    '/security': 'Pengaturan keamanan akun',
    '/sessions': 'Kelola perangkat yang login',
    '/logs': 'Aktivitas login Anda',
    '/documents': 'Kelola dokumen pribadi',
    '/notes': 'Catatan dan memo'
  };

  return (
    <header className="page-header">
      <div className="header-left">
        <h2>{titles[location.pathname] || 'Dashboard'}</h2>
        <p>{subtitles[location.pathname] || ''}</p>
      </div>
      <div className="header-right">
        <div className="user-menu">
          <div className="user-avatar">
            <UserCircle size={36} weight="fill" />
          </div>
          <div className="user-info">
            <span className="user-name">{user?.fullName || 'User'}</span>
            <span className="user-email">{user?.email || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
