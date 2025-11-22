import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { currentUser, logout, userRole, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { 
      label: 'Entry', 
      icon: '📝',
      submenu: [
        { path: '/h-entry', label: 'H Entry' },
        { path: '/cy-entry', label: 'CY Entry' },
        { path: '/gp-entry', label: 'GP Entry' }
      ]
    },
    { 
      label: 'Patients', 
      icon: '👥',
      submenu: [
        { path: '/patients-h', label: 'Patients H' },
        { path: '/patients-cy', label: 'Patients CY' },
        { path: '/patients-gp', label: 'Patients GP' }
      ]
    },
    { path: '/ihc-tests', label: 'IHC Tests', icon: '🧬' },
    { path: '/excel-upload', label: 'Upload', icon: '📤' },
    { path: '/statistics', label: 'Statistics', icon: '📈' },
  ];

  if (isAdmin) {
    navLinks.push({ path: '/admin', label: 'Admin', icon: '⚙️' });
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const isSubmenuActive = (submenu) => {
    return submenu.some(item => location.pathname === item.path);
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo" onClick={() => setIsMenuOpen(false)}>
          <svg viewBox="0 0 40 40" className="logo-svg">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M 12 20 L 18 26 L 28 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="logo-text">Phoenix Lab</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-menu desktop-menu">
          {navLinks.map((link, index) => (
            link.submenu ? (
              <div key={index} className={`nav-item-group ${isSubmenuActive(link.submenu) ? 'active' : ''}`}>
                <button className="nav-item nav-dropdown-trigger">
                  <span className="nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                  <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                <div className="nav-dropdown">
                  {link.submenu.map((sublink, subIndex) => (
                    <Link
                      key={subIndex}
                      to={sublink.path}
                      className={`nav-dropdown-item ${isActive(sublink.path) ? 'active' : ''}`}
                    >
                      {sublink.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={index}
                to={link.path}
                className={`nav-item ${isActive(link.path) ? 'active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          ))}
        </div>

        {/* User Menu */}
        <div className="navbar-actions">
          <div className="user-menu-wrapper">
            <button 
              className="user-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {getInitials(currentUser?.email)}
              </div>
              <div className="user-info">
                <span className="user-email">{currentUser?.email}</span>
                <span className="user-role">{userRole}</span>
              </div>
              <svg className="user-menu-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-avatar-large">
                    {getInitials(currentUser?.email)}
                  </div>
                  <div className="user-dropdown-info">
                    <div className="user-dropdown-email">{currentUser?.email}</div>
                    <div className="user-dropdown-role">
                      <span className={`role-badge ${userRole}`}>{userRole}</span>
                    </div>
                  </div>
                </div>
                <div className="user-dropdown-divider"></div>
                <button className="user-dropdown-item logout-button" onClick={handleLogout}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className={`mobile-menu-toggle ${isMenuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link, index) => (
            link.submenu ? (
              <div key={index} className="mobile-nav-group">
                <div className="mobile-nav-group-title">
                  <span className="nav-icon">{link.icon}</span>
                  {link.label}
                </div>
                {link.submenu.map((sublink, subIndex) => (
                  <Link
                    key={subIndex}
                    to={sublink.path}
                    className={`mobile-nav-item submenu-item ${isActive(sublink.path) ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {sublink.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={index}
                to={link.path}
                className={`mobile-nav-item ${isActive(link.path) ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </Link>
            )
          ))}

          <div className="mobile-menu-footer">
            <button className="mobile-logout-button" onClick={handleLogout}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(isMenuOpen || showUserMenu) && (
        <div 
          className="navbar-overlay" 
          onClick={() => {
            setIsMenuOpen(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;
