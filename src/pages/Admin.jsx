import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import './Admin.css';

const Admin = () => {
  const [hEntryUrl, setHEntryUrl] = useState('');
  const [cyEntryUrl, setCyEntryUrl] = useState('');
  const [gpEntryUrl, setGpEntryUrl] = useState('');
  const [hCounter, setHCounter] = useState('1499/25');
  const [cyCounter, setCyCounter] = useState('0034/25');
  const [gpCounter, setGpCounter] = useState('0036/25');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load Google Sheets URLs
      const sheetDoc = await getDoc(doc(db, 'settings', 'googleSheets'));
      if (sheetDoc.exists()) {
        const data = sheetDoc.data();
        setHEntryUrl(data.hEntryUrl || '');
        setCyEntryUrl(data.cyEntryUrl || '');
        setGpEntryUrl(data.gpEntryUrl || '');
      }

      // Load counters
      const hCounterDoc = await getDoc(doc(db, 'counters', 'hEntry'));
      if (hCounterDoc.exists()) setHCounter(hCounterDoc.data().current);
      const cyCounterDoc = await getDoc(doc(db, 'counters', 'cyEntry'));
      if (cyCounterDoc.exists()) setCyCounter(cyCounterDoc.data().current);
      const gpCounterDoc = await getDoc(doc(db, 'counters', 'gpEntry'));
      if (gpCounterDoc.exists()) setGpCounter(gpCounterDoc.data().current);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSheetUrls = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'googleSheets'), {
        hEntryUrl,
        cyEntryUrl,
        gpEntryUrl,
      });
      alert('Google Sheets URLs saved successfully!');
    } catch (error) {
      console.error('Error saving URLs:', error);
      alert('Error saving URLs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCounter = async (type, value) => {
    if (!value.includes('/')) {
      alert('Please enter counter in format: number/year (e.g., 1080/25)');
      return;
    }
    const parts = value.split('/');
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      alert('Invalid format. Use: number/year (e.g., 1080/25)');
      return;
    }
    setLoading(true);
    try {
      await setDoc(doc(db, 'counters', `${type}Entry`), { current: value });
      alert(`${type.toUpperCase()} counter reset to ${value}`);
    } catch (error) {
      console.error('Error resetting counter:', error);
      alert('Error resetting counter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="page-container admin-page">
      <h1 className="page-title">Admin Settings</h1>

      <div className="admin-container">
        {/* Google Sheets URLs Section */}
        <section className="admin-section">
          <h2 className="section-title">Google Sheets Integration</h2>
          <p className="section-description">
            Enter Google Apps Script URLs to enable automatic data sync.
          </p>

          <div className="form-group">
            <label htmlFor="hEntryUrl" className="form-label">
              H Entry Apps Script URL
            </label>
            <input
              id="hEntryUrl"
              type="url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/..."
              value={hEntryUrl}
              onChange={(e) => setHEntryUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cyEntryUrl" className="form-label">
              CY Entry Apps Script URL
            </label>
            <input
              id="cyEntryUrl"
              type="url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/..."
              value={cyEntryUrl}
              onChange={(e) => setCyEntryUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="gpEntryUrl" className="form-label">
              GP Entry Apps Script URL
            </label>
            <input
              id="gpEntryUrl"
              type="url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/..."
              value={gpEntryUrl}
              onChange={(e) => setGpEntryUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSaveSheetUrls}
            className="btn btn-primary"
            disabled={loading}
            type="button"
          >
            {loading ? 'Saving...' : 'Save Google Sheets URLs'}
          </button>
        </section>

        {/* Apps Script Code Section */}
        <section className="admin-section">
          <h2 className="section-title">Google Apps Script Code</h2>
          <p className="section-description">
            Copy this to your Google Apps Script editor and deploy as web app:
          </p>
          <pre className="code-block">
{`function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    var row = [
      data.date || '',
      data.hNumber || data.cyNumber || data.gpNumber || '',
      data.patientName || '',
      data.age || '',
      data.gender || '',
      data.hospital || '',
      data.doctor || '',
      data.clinicalInfo || '',
      data.containers || '',
      Array.isArray(data.tests) ? data.tests.join(', ') : (data.test || ''),
      data.enteredBy || ''
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`}
          </pre>
        </section>

        {/* Entry Counters Reset Section */}
        <section className="admin-section">
          <h2 className="section-title">Reset Entry Counters</h2>
          <p className="section-description">
            Set starting numbers for each entry type (format: number/year).
          </p>

          <div className="counter-group">
            <div className="form-group counter-item">
              <label htmlFor="hCounter" className="form-label">
                H Entry Counter
              </label>
              <div className="input-button">
                <input
                  id="hCounter"
                  type="text"
                  className="form-control"
                  placeholder="1080/25"
                  value={hCounter}
                  onChange={(e) => setHCounter(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={() => handleResetCounter('h', hCounter)}
                  className="btn btn-secondary"
                  disabled={loading}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="form-group counter-item">
              <label htmlFor="cyCounter" className="form-label">
                CY Entry Counter
              </label>
              <div className="input-button">
                <input
                  id="cyCounter"
                  type="text"
                  className="form-control"
                  placeholder="0034/25"
                  value={cyCounter}
                  onChange={(e) => setCyCounter(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={() => handleResetCounter('cy', cyCounter)}
                  className="btn btn-secondary"
                  disabled={loading}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="form-group counter-item">
              <label htmlFor="gpCounter" className="form-label">
                GP Entry Counter
              </label>
              <div className="input-button">
                <input
                  id="gpCounter"
                  type="text"
                  className="form-control"
                  placeholder="0036/25"
                  value={gpCounter}
                  onChange={(e) => setGpCounter(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={() => handleResetCounter('gp', gpCounter)}
                  className="btn btn-secondary"
                  disabled={loading}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Logout Section */}
        <section className="admin-section">
          <button onClick={handleLogout} className="btn btn-secondary logout-btn" type="button">
            Logout
          </button>
        </section>
      </div>
    </div>
  );
};

export default Admin;
