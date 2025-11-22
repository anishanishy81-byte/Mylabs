import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    purpose: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Get Google Sheet URL from Vite environment variable
  const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.mobile || !formData.email || !formData.purpose) {
      setSubmitStatus('error');
      alert('Please fill in all fields');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus('error');
      alert('Please enter a valid email address');
      return;
    }

    // Validate mobile (basic validation for 10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(formData.mobile.replace(/[-()\s]/g, ''))) {
      setSubmitStatus('error');
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      if (!GOOGLE_SHEET_URL) {
        throw new Error('Google Sheet URL not configured');
      }

      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          purpose: formData.purpose,
          timestamp: new Date().toISOString()
        })
      });

      // Since we're using no-cors, we won't get a response, so we assume success
      setSubmitStatus('success');
      setFormData({
        name: '',
        mobile: '',
        email: '',
        purpose: ''
      });
      
      setTimeout(() => {
        setShowContactForm(false);
        setSubmitStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      alert('Failed to submit form. Please try again or contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: '📋',
      title: 'Digital Specimen Management',
      description: 'Automated entry system for Histopathology, Cytology, and Gynecological specimens with intelligent numbering.'
    },
    {
      icon: '🧬',
      title: 'IHC Marker Analytics',
      description: 'Advanced tracking and statistical analysis of immunohistochemistry markers with comprehensive reporting.'
    },
    {
      icon: '📊',
      title: 'Data Analytics Dashboard',
      description: 'Real-time insights and customizable reports with date-range filtering and export capabilities.'
    },
    {
      icon: '☁️',
      title: 'Cloud Integration',
      description: 'Seamless Google Sheets synchronization for data backup and multi-platform accessibility.'
    },
    {
      icon: '🔍',
      title: 'Advanced Search',
      description: 'Powerful search and filtering across all patient records, tests, and markers for instant retrieval.'
    },
    {
      icon: '🔐',
      title: 'Enterprise Security',
      description: 'Role-based access control, encrypted storage, and full audit trails for compliance.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <div className="header-logo">
            <img 
              src="/src/assets/1.png" 
              alt="Phoenix Oncopathology Logo" 
              className="logo-image"
              onError={(e) => {
                // Fallback to SVG icon if image fails to load
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <svg viewBox="0 0 40 40" className="logo-icon" style={{ display: 'none' }}>
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M 12 20 L 18 26 L 28 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">My Labs</span>
          </div>
          <div className="header-actions">
            <button className="header-contact-btn" onClick={() => setShowContactForm(true)}>
              Get Custom Solution
            </button>
            <button className="header-login-btn" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Cancer Diagnostic Excellence
            </div>
            
            <h1 className="hero-title">
              Advanced Laboratory
              <span className="hero-title-highlight"> Management System</span>
            </h1>
            
            <p className="hero-description">
              Streamline your pathology operations with our comprehensive digital platform. 
              Manage specimens, track IHC markers, and generate insights—all in one secure, 
              cloud-based solution designed specifically for oncology diagnostic laboratories.
            </p>
            
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Access Platform
                <svg className="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
              <button className="btn-secondary-hero" onClick={() => setShowContactForm(true)}>
                Request Custom Solution
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">24/7</div>
                <div className="stat-label">Access</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Secure</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-header">
                <div className="visual-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="visual-title">Patient Dashboard</div>
              </div>
              <div className="visual-content">
                <div className="visual-row">
                  <div className="visual-icon">📋</div>
                  <div className="visual-info">
                    <div className="visual-label">H Entry</div>
                    <div className="visual-count">1,247 records</div>
                  </div>
                </div>
                <div className="visual-row">
                  <div className="visual-icon">🔬</div>
                  <div className="visual-info">
                    <div className="visual-label">IHC Markers</div>
                    <div className="visual-count">3,856 tests</div>
                  </div>
                </div>
                <div className="visual-row">
                  <div className="visual-icon">📊</div>
                  <div className="visual-info">
                    <div className="visual-label">Analytics</div>
                    <div className="visual-count">Real-time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Comprehensive Platform Features</h2>
            <p className="section-subtitle">
              Built for modern pathology laboratories with advanced diagnostic requirements
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">{feature.icon}</span>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="benefits-container">
          <div className="benefits-content">
            <h2 className="benefits-title">Why To Choose My Labs</h2>
            <p className="benefits-subtitle">
              Transform your laboratory operations with proven digital solutions
            </p>

            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="benefit-text">
                  <h4>Eliminate Manual Errors</h4>
                  <p>Automated validation and numbering ensure 100% data accuracy</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="benefit-text">
                  <h4>Accelerate Workflow</h4>
                  <p>Reduce data entry time by 70% with bulk import and quick search</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="benefit-text">
                  <h4>Complete Audit Trail</h4>
                  <p>Track every action with timestamps and user attribution for compliance</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="benefit-text">
                  <h4>Scale Seamlessly</h4>
                  <p>From small clinics to large diagnostic centers—grows with your lab</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Modernize Your Laboratory?</h2>
          <p className="cta-description">
            Join pathology labs using My Labs to streamline operations and improve diagnostic accuracy
          </p>
          <button className="cta-button" onClick={() => navigate('/login')}>
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <img 
                src="/src/assets/1.png" 
                alt="Logo" 
                className="footer-logo-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <svg viewBox="0 0 40 40" className="logo-icon" style={{ display: 'none' }}>
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M 12 20 L 18 26 L 28 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="footer-logo-text">MY LABS</span>
            </div>
            <p className="footer-tagline">Advanced Cancer Diagnostic Laboratory Management</p>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">© 2025 ANISH SINGH RAJPUROHIT. All rights reserved.</p>
            <div className="footer-security">
              <svg className="security-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <span>Enterprise-Grade Security</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="modal-overlay" onClick={() => setShowContactForm(false)}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Request Custom Solution</h3>
              <button className="modal-close" onClick={() => setShowContactForm(false)}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
            
            <p className="modal-description">
              Tell us about your requirements and we'll create a custom data management solution for your laboratory.
            </p>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="mobile">Mobile Number *</label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit mobile number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="purpose">Purpose / Requirements *</label>
                <textarea
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Describe your laboratory management needs..."
                  rows="4"
                  required
                />
              </div>

              {submitStatus === 'success' && (
                <div className="success-message">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Request submitted successfully! We'll contact you soon.</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="error-message">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <span>Failed to submit. Please try again.</span>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowContactForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;