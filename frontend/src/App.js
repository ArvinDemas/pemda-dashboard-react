import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
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
import './styles/App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const authInitialized = useRef(false);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      window.history.replaceState({}, document.title, '/');
      checkExistingAuth();
      return;
    }

    if (code) {
      handleTokenExchange(code);
    } else {
      checkExistingAuth();
    }
  }, []);

  const handleTokenExchange = async (code) => {
    const apiUrl = process.env.REACT_APP_API_URL ||
      (window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : `http://${window.location.hostname}:5000`);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: window.location.origin })
      });

      if (!response.ok) throw new Error('Authentication failed');

      const data = await response.json();
      localStorage.setItem('access_token', data.tokens.accessToken);
      localStorage.setItem('refresh_token', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setAuthenticated(true);
      window.history.replaceState({}, document.title, '/');

      const toast = (await import('react-hot-toast')).default;
      toast.success('Login Berhasil!', { duration: 3000 });
    } catch (error) {
      console.error('Auth error:', error);
      setAuthenticated(false);
    }
    setLoading(false);
  };

  const checkExistingAuth = () => {
    const accessToken = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (accessToken && userData) {
      try {
        setUser(JSON.parse(userData));
        setAuthenticated(true);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  };

  const handleLogin = () => {
    const keycloakUrl = process.env.REACT_APP_KEYCLOAK_URL ||
      `http://${window.location.hostname}:8080`;
    const params = new URLSearchParams({
      client_id: 'pemda-dashboard',
      redirect_uri: window.location.origin,
      response_type: 'code',
      scope: 'openid roles'
    });
    window.location.href = `${keycloakUrl}/realms/PemdaSSO/protocol/openid-connect/auth?${params.toString()}`;
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    localStorage.clear();
    setAuthenticated(false);
    setUser(null);

    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5000'
      : `http://${window.location.hostname}:5000`;

    if (refreshToken) {
      fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      }).catch(() => {});
    }

    const toast = (await import('react-hot-toast')).default;
    toast.success('Logout Berhasil!', { duration: 2000 });
    window.location.href = '/logout-success';
  };

  if (loading) return <Loading />;

  if (!authenticated) {
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
