/**
 * Dashboard Page - Grid Hero Layout with Carousel
 * NO top header, NO user badge - Hero IS the header
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Files, NotePencil, Desktop, CaretLeft, CaretRight } from 'phosphor-react';
import statsService from '../services/statsService';
import '../styles/Dashboard.css';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    notes: { total: 0 },
    documents: { total: 0 },
    sessions: { active: 0 }
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselSlides = [
    {
      image: '/hero-tugu.png',
      title: 'Tugu Yogyakarta',
      subtitle: 'Landmark Bersejarah Kota Jogja'
    },
    {
      image: '/hero-malioboro.png',
      title: 'Malioboro Street',
      subtitle: 'Jantung Pariwisata Yogyakarta'
    },
    {
      image: '/hero-kraton.png',
      title: 'Kraton Yogyakarta',
      subtitle: 'Istana Kesultanan Ngayogyakarta Hadiningrat'
    }
  ];

  useEffect(() => {
    loadStats();

    // Auto-rotate carousel every 5 seconds
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      console.log('📊 Loading dashboard stats...');

      const [notesData, docsData, sessionsData] = await Promise.all([
        statsService.getNotesStats(),
        statsService.getDocumentsStats(),
        statsService.getSessionsStats()
      ]);

      console.log('📊 Stats loaded:', {
        notes: notesData,
        documents: docsData,
        sessions: sessionsData
      });

      setStats({
        notes: notesData || { total: 0 },
        documents: docsData || { total: 0 },
        sessions: sessionsData || { active: 0 }
      });
    } catch (error) {
      console.error('❌ Failed to load stats:', error);
      // Set safe defaults on error
      setStats({
        notes: { total: 0 },
        documents: { total: 0 },
        sessions: { active: 0 }
      });
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="dashboard-page">
      {/* HERO SECTION - GRID LAYOUT (3fr 1fr) */}
      <div className="dashboard-hero">
        {/* LEFT: Banner Carousel */}
        <div className="hero-carousel">
          <div className="carousel-container">
            {carouselSlides.map((slide, index) => (
              <div
                key={index}
                className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="carousel-overlay">
                  <h1 className="carousel-title">{slide.title}</h1>
                  <p className="carousel-subtitle">{slide.subtitle}</p>
                </div>
              </div>
            ))}

            {/* Navigation Buttons */}
            <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous">
              <CaretLeft size={24} weight="bold" />
            </button>
            <button className="carousel-btn next" onClick={nextSlide} aria-label="Next">
              <CaretRight size={24} weight="bold" />
            </button>

            {/* Indicators */}
            <div className="carousel-indicators">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Profile Card */}
        <div className="profile-card" onClick={() => navigate('/settings')}>
          <div className="profile-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">{getInitials()}</div>
            )}
          </div>

          <h3 className="profile-name">
            {user?.firstName && user?.lastName
              ? `${user.firstName} ${user.lastName}`
              : user?.username || 'User'}
          </h3>

          <p className="profile-email">{user?.email || 'email@example.com'}</p>
        </div>
      </div>

      {/* STATS CARDS - Below Hero */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/documents')}>
          <div className="stat-icon files">
            <Files size={32} weight="fill" />
          </div>
          <div className="stat-info">
            <h3>{stats.documents.total || 0}</h3>
            <p>Total Dokumen</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/notes')}>
          <div className="stat-icon notes">
            <NotePencil size={32} weight="fill" />
          </div>
          <div className="stat-info">
            <h3>{stats.notes.total || 0}</h3>
            <p>Total Catatan</p>
          </div>
        </div>

        <div className="stat-card" onClick={() => navigate('/sessions')}>
          <div className="stat-icon sessions">
            <Desktop size={32} weight="fill" />
          </div>
          <div className="stat-info">
            <h3>{stats.sessions.active || 0}</h3>
            <p>Sesi Aktif</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
