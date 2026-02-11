/**
 * PEMDA DIY Dashboard - React App
 * Main Application Component with Backend Proxy Authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import LogoutSuccess from './pages/LogoutSuccess';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Sessions from './pages/Sessions';
import Logs from './pages/Logs';
import Documents from './pages/Documents';
import Notes from './pages/Notes';
import UserManagement from './pages/UserManagement';
import Loading from './components/Loading';
import ErrorBoundary from './components/shared/ErrorBoundary';

// Styles
import './styles/App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Guard against double initialization
  const authInitialized = useRef(false);

  useEffect(() => {
    if (authInitialized.current) {
      console.log('⚠️ Auth already initialized, skipping...');
      return;
    }

    console.log('🔐 Starting authentication check...');
    console.log('📍 URL:', window.location.href);

    // Check for authorization code in both query and hash
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const code = searchParams.get('code') || hashParams.get('code');

    authInitialized.current = true;

    if (code) {
      console.log('✅ Auth code detected:', code.substring(0, 15) + '...');
      handleTokenExchange(code);
    } else {
      console.log('ℹ️ No auth code - checking local storage');
      checkExistingAuth();
    }
  }, []);

  const handleTokenExchange = async (code) => {
    console.log('🔄 Exchanging code for token via backend...');

    // Use current host IP for API if not localhost
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : `http://${window.location.hostname}:5000`;

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: window.location.origin
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Token exchange failed:', error);
        throw new Error(error.error || 'Authentication failed');
      }

      const data = await response.json();
      console.log('✅ Token exchange successful');
      console.log('👤 User:', data.user.username);

      // Store tokens in localStorage
      localStorage.setItem('access_token', data.tokens.accessToken);
      localStorage.setItem('refresh_token', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('💾 Tokens stored in localStorage');

      // Update state
      setUser(data.user);
      setAuthenticated(true);
      setLoading(false);

      // Show success toast
      const toast = (await import('react-hot-toast')).default;
      toast.success('Login Berhasil!', {
        duration: 3000,
        icon: '✅',
      });

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('✅ Authentication complete - Dashboard should render');

    } catch (error) {
      console.error('❌ Authentication error:', error);
      setAuthenticated(false);
      setLoading(false);
    }
  };

  const checkExistingAuth = () => {
    const accessToken = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (accessToken && userData) {
      console.log('🔍 Found existing auth in localStorage');

      try {
        const user = JSON.parse(userData);
        setUser(user);
        setAuthenticated(true);
        console.log('✅ Restored session for:', user.username);
      } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        localStorage.clear();
      }
    } else {
      console.log('ℹ️ No existing auth found');
    }

    setLoading(false);
  };

  const handleLogin = () => {
    console.log('🔐 Redirecting to Keycloak...');

    const keycloakUrl = 'http://10.7.183.128:8080';
    const realm = 'Jogja-SSO';
    const clientId = 'pemda-dashboard';
    const redirectUri = window.location.origin;

    // Generate PKCE challenge (optional but recommended)
    const authUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid%20roles`;

    console.log('🌐 Redirect URL:', authUrl);
    window.location.href = authUrl;
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out...');

    const refreshToken = localStorage.getItem('refresh_token');

    // Clear local storage immediately
    localStorage.clear();
    setAuthenticated(false);
    setUser(null);

    console.log('✅ Local session cleared');

    // Try to call backend logout silently (don't wait or fail if it errors)
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : `http://${window.location.hostname}:5000`;

    // Make this non-blocking - fire and forget
    if (refreshToken) {
      fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      }).catch(err => {
        console.warn('⚠️ Backend logout failed (non-critical):', err);
      });
    }

    // Show success toast
    const toast = (await import('react-hot-toast')).default;
    toast.success('Logout Berhasil!', {
      duration: 2000,
      style: {
        background: '#0ea5e9',
        color: '#fff',
      },
    });

    // Redirect to logout success page immediately (no Keycloak redirect!)
    window.location.href = '/logout-success';
  };

  if (loading) {
    console.log('🔄 Rendering: Loading screen');
    return <Loading />;
  }

  if (!authenticated) {
    console.log('🔓 Rendering: Login page');
    return (
      <ErrorBoundary>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/logout-success" element={<LogoutSuccess />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    );
  }

  console.log('✅ Rendering: Dashboard');

  return (
    <ErrorBoundary>
      <Router>
        <div className="dashboard-container">
          <Sidebar onLogout={handleLogout} user={user} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/settings" element={<Settings user={user} />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
