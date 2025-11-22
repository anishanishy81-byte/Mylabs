import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [stats, setStats] = useState({
    hEntries: 0,
    cyEntries: 0,
    gpEntries: 0,
    ihcTests: 0
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load statistics
      const [hDocs, cyDocs, gpDocs] = await Promise.all([
        getDocs(collection(db, 'hEntries')),
        getDocs(collection(db, 'cyEntries')),
        getDocs(collection(db, 'gpEntries'))
      ]);

      // Count IHC tests from H entries
      let ihcCount = 0;
      hDocs.docs.forEach(doc => {
        const data = doc.data();
        if (data.markers && data.markers.length > 0) {
          ihcCount++;
        }
      });

      setStats({
        hEntries: hDocs.size,
        cyEntries: cyDocs.size,
        gpEntries: gpDocs.size,
        ihcTests: ihcCount
      });

      // Load recent entries
      const allEntries = [];
      
      hDocs.docs.slice(0, 5).forEach(doc => {
        const data = doc.data();
        allEntries.push({
          id: doc.id,
          type: 'H',
          number: data.hNumber,
          patient: data.patientName,
          date: data.date,
          timestamp: data.timestamp
        });
      });

      allEntries.sort((a, b) => b.timestamp - a.timestamp);
      setRecentEntries(allEntries.slice(0, 5));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'New H Entry',
      description: 'Create histopathology entry',
      icon: '📝',
      path: '/h-entry',
      color: 'blue'
    },
    {
      title: 'New CY Entry',
      description: 'Create cytology entry',
      icon: '🔬',
      path: '/cy-entry',
      color: 'purple'
    },
    {
      title: 'New GP Entry',
      description: 'Create gynecological entry',
      icon: '📋',
      path: '/gp-entry',
      color: 'green'
    },
    {
      title: 'IHC Tests',
      description: 'Manage IHC markers',
      icon: '🧬',
      path: '/ihc-tests',
      color: 'orange'
    },
    {
      title: 'Upload Data',
      description: 'Bulk import from Excel',
      icon: '📤',
      path: '/excel-upload',
      color: 'teal'
    },
    {
      title: 'View Statistics',
      description: 'Analytics and reports',
      icon: '📈',
      path: '/statistics',
      color: 'pink'
    }
  ];

  const navCards = [
    {
      title: 'Patients H',
      count: stats.hEntries,
      icon: '👥',
      path: '/patients-h',
      color: 'var(--color-bg-1)',
      description: 'Histopathology records'
    },
    {
      title: 'Patients CY',
      count: stats.cyEntries,
      icon: '👥',
      path: '/patients-cy',
      color: 'var(--color-bg-2)',
      description: 'Cytology records'
    },
    {
      title: 'Patients GP',
      count: stats.gpEntries,
      icon: '👥',
      path: '/patients-gp',
      color: 'var(--color-bg-3)',
      description: 'Gynecological records'
    },
    {
      title: 'IHC Markers',
      count: stats.ihcTests,
      icon: '🧬',
      path: '/ihc-tests',
      color: 'var(--color-bg-4)',
      description: 'Immunohistochemistry'
    }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, <span className="user-name">{currentUser?.email?.split('@')[0]}</span>
            </p>
          </div>
          <div className="header-badge">
            <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            <span className="badge-text">{userRole}</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-section">
          <h2 className="section-title">Overview</h2>
          <div className="stats-grid">
            {navCards.map((card, index) => (
              <div
                key={index}
                className="stat-card"
                onClick={() => navigate(card.path)}
                style={{ background: card.color }}
              >
                <div className="stat-card-header">
                  <div className="stat-icon">{card.icon}</div>
                  <div className="stat-count">{card.count}</div>
                </div>
                <div className="stat-info">
                  <h3 className="stat-title">{card.title}</h3>
                  <p className="stat-description">{card.description}</p>
                </div>
                <div className="stat-arrow">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`quick-action-card ${action.color}`}
                onClick={() => navigate(action.path)}
              >
                <div className="action-icon-wrapper">
                  <span className="action-icon">{action.icon}</span>
                </div>
                <div className="action-content">
                  <h3 className="action-title">{action.title}</h3>
                  <p className="action-description">{action.description}</p>
                </div>
                <svg className="action-arrow" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-section">
          <div className="section-header-row">
            <h2 className="section-title">Recent Entries</h2>
            <button className="view-all-btn" onClick={() => navigate('/patients-h')}>
              View All
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {recentEntries.length > 0 ? (
            <div className="recent-list">
              {recentEntries.map((entry, index) => (
                <div key={index} className="recent-item">
                  <div className="recent-type-badge">
                    <span className={`type-label ${entry.type.toLowerCase()}`}>{entry.type}</span>
                  </div>
                  <div className="recent-info">
                    <div className="recent-patient">{entry.patient}</div>
                    <div className="recent-number">{entry.number}</div>
                  </div>
                  <div className="recent-date">{formatDate(entry.date)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p className="empty-text">No recent entries</p>
              <p className="empty-subtext">Start by creating your first entry</p>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="info-cards-section">
          <div className="info-card">
            <div className="info-card-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Need Help?</h3>
              <p className="info-card-text">Access documentation and support resources for the lab management system.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-icon success">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="info-card-content">
              <h3 className="info-card-title">Secure & Compliant</h3>
              <p className="info-card-text">Your data is encrypted and backed up automatically. All changes are logged.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
