/**
 * Collapsible Sidebar Component
 * Modern sidebar with BLUE accent colors (NO RED), glassmorphism active state
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  House, ShieldCheck, Desktop, ClockClockwise,
  Files, NotePencil, Users, SignOut, List, X, GearSix
} from 'phosphor-react';
import '../styles/Sidebar.css';

const Sidebar = ({ onLogout, user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Check if user has admin role - check ALL possible token structures
  // Support both camelCase (realmAccess) and snake_case (realm_access) from different Keycloak versions
  const realmRoles = user?.realmAccess?.roles || user?.realm_access?.roles || [];

  // Check client-specific roles in multiple ways
  const resourceAccess = user?.resourceAccess || user?.resource_access || {};
  const realmManagementRoles = resourceAccess?.['realm-management']?.roles || [];

  // Also check if roles are directly on the user object
  const directRoles = user?.roles || [];

  // Combine all possible role sources
  const allRoles = [...realmRoles, ...realmManagementRoles, ...directRoles];

  // PERMISSIVE ROLE CHECK: Accept ANY of these role variations (case-insensitive)
  const adminRoleVariations = ['admin', 'realm-admin', 'manage-users', 'super_admin', 'realm-management'];
  const hasAdminRole = allRoles.some(role =>
    adminRoleVariations.some(adminRole => role.toLowerCase() === adminRole.toLowerCase())
  );

  // HARDCODED BYPASS: Always grant access to admin@gmail.com
  const isHardcodedAdmin = user?.email === 'admin@gmail.com';

  const isAdmin = hasAdminRole || isHardcodedAdmin;

  // Enhanced debugging - log full user object and all found roles
  console.log('🔍 ============ ROLE DETECTION DEBUG ============');
  console.log('👤 Full user object:', user);
  console.log('📧 User email:', user?.email);
  console.log('📋 User Roles (user.roles):', directRoles);
  console.log('📋 Realm roles:', realmRoles);
  console.log('📋 Realm-management client roles:', realmManagementRoles);
  console.log('📋 ALL COMBINED ROLES:', allRoles);
  console.log('🔑 Has Admin Role?', hasAdminRole);
  console.log('🔓 Hardcoded Admin Bypass?', isHardcodedAdmin);
  console.log('✅ Final Is Admin?', isAdmin);
  console.log('🔍 ============================================');

  const navItems = [
    { path: '/', icon: House, label: 'Dashboard' },
    { path: '/settings', icon: GearSix, label: 'Pengaturan Akun' },
    { path: '/sessions', icon: Desktop, label: 'Sesi Aktif' },
    { path: '/logs', icon: ClockClockwise, label: 'Riwayat Login' },
    { path: '/documents', icon: Files, label: 'Dokumen' },
    { path: '/notes', icon: NotePencil, label: 'Catatan' },
  ];

  // Add User Management for admins only
  if (isAdmin) {
    navItems.push({ path: '/users', icon: Users, label: 'Manajemen User' });
  }

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Toggle desktop sidebar collapse
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Toggle mobile drawer
  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button - Visible only on mobile */}
      <button
        className="mobile-menu-toggle"
        onClick={toggleMobile}
        aria-label="Toggle menu"
      >
        <List size={24} weight="bold" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-box">
            <img
              src="https://jogjaprov.go.id/storage/files/shares/page/1518066730_2d84b769e3cc9d6f06f8c91a6c3e285c.jpg"
              alt="Logo DIY"
            />
          </div>
          {!isCollapsed && (
            <div className="brand-text">
              <h1 style={{ fontSize: '1.05rem', lineHeight: '1.1', marginBottom: '2px' }}>Pemerintah Daerah</h1>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Daerah Istimewa Yogyakarta</p>
            </div>
          )}

          {/* Mobile Close Button */}
          <button
            className="mobile-close-btn"
            onClick={toggleMobile}
            aria-label="Close menu"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Desktop Toggle Button - positioned at top for easy access */}
        <button
          className="collapse-toggle desktop-only"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <List size={20} weight="bold" />
          {!isCollapsed && <span>Collapse</span>}
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? label : ''}
            >
              <Icon size={24} weight="regular" />
              {!isCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Logout Button */}
          <button className="logout-btn" onClick={onLogout}>
            <SignOut size={20} weight="regular" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
