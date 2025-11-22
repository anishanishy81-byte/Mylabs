import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as XLSX from 'xlsx';
import './Statistics.css';

const Statistics = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hStats, setHStats] = useState({});
  const [cyCount, setCyCount] = useState(0);
  const [gpCount, setGpCount] = useState(0);
  const [markerStats, setMarkerStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadStatistics();
    }
  }, [startDate, endDate]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHStats(),
        loadCYStats(),
        loadGPStats(),
        loadMarkerStats()
      ]);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const isInDateRange = (entryDate) => {
    if (!entryDate) return false;
    return entryDate >= startDate && entryDate <= endDate;
  };

  const loadHStats = async () => {
    const querySnapshot = await getDocs(collection(db, 'hEntries'));
    const stats = {
      'Small': 0,
      'Medium': 0,
      'Large': 0,
      'Extra Large': 0,
      'Expert Opinion': 0,
      'IHC': 0
    };

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isInDateRange(data.date)) {
        const tests = Array.isArray(data.tests) ? data.tests : [data.tests];
        tests.forEach(test => {
          if (test && stats.hasOwnProperty(test)) {
            stats[test]++;
          }
        });
      }
    });

    setHStats(stats);
  };

  const loadCYStats = async () => {
    const querySnapshot = await getDocs(collection(db, 'cyEntries'));
    let count = 0;
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isInDateRange(data.date)) {
        count++;
      }
    });

    setCyCount(count);
  };

  const loadGPStats = async () => {
    const querySnapshot = await getDocs(collection(db, 'gpEntries'));
    let count = 0;
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (isInDateRange(data.date)) {
        count++;
      }
    });

    setGpCount(count);
  };

  const loadMarkerStats = async () => {
    const querySnapshot = await getDocs(collection(db, 'hEntries'));
    const markerCounts = {};
    const markerRepeatCounts = {};
    const patientMarkers = {};

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const patientId = data.hNumber;

      if (data.markers && Array.isArray(data.markers)) {
        data.markers.forEach(markerEntry => {
          if (isInDateRange(markerEntry.date)) {
            markerEntry.markers.forEach(marker => {
              markerCounts[marker] = (markerCounts[marker] || 0) + 1;

              if (!patientMarkers[patientId]) {
                patientMarkers[patientId] = {};
              }
              
              if (!patientMarkers[patientId][marker]) {
                patientMarkers[patientId][marker] = 0;
              }
              
              patientMarkers[patientId][marker]++;
            });
          }
        });
      }
    });

    Object.keys(patientMarkers).forEach(patientId => {
      Object.keys(patientMarkers[patientId]).forEach(marker => {
        const count = patientMarkers[patientId][marker];
        if (count > 1) {
          markerRepeatCounts[marker] = (markerRepeatCounts[marker] || 0) + (count - 1);
        }
      });
    });

    const statsArray = Object.keys(markerCounts).map(marker => ({
      marker,
      total: markerCounts[marker],
      repeat: markerRepeatCounts[marker] || 0
    })).sort((a, b) => b.total - a.total);

    setMarkerStats(statsArray);
  };

  const downloadCSV = () => {
    const data = [
      { Category: 'H Entry Tests', Type: '', Count: '' },
      ...Object.entries(hStats).map(([type, count]) => ({
        Category: '',
        Type: type,
        Count: count
      })),
      { Category: '', Type: '', Count: '' },
      { Category: 'Cytology', Type: 'Total', Count: cyCount },
      { Category: 'GP (PAP SMEAR)', Type: 'Total', Count: gpCount },
      { Category: '', Type: '', Count: '' },
      { Category: 'IHC Markers', Type: '', Count: '' },
      { Category: 'Marker', Type: 'Total Count', Count: 'Repeat Count' },
      ...markerStats.map(m => ({
        Category: m.marker,
        Type: m.total,
        Count: m.repeat
      }))
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statistics');
    XLSX.writeFile(wb, `statistics_${startDate}_to_${endDate}.xlsx`);
  };

  const getTotalHCount = () => {
    return Object.values(hStats).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="statistics-page">
        <div className="statistics-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="statistics-container">
        {/* Header */}
        <div className="statistics-header">
          <div className="header-content">
            <h1 className="statistics-title">Statistics Report</h1>
            <p className="statistics-subtitle">Lab Analytics & Performance Metrics</p>
          </div>
        </div>

        {/* Date Filter Card */}
        <div className="filter-card">
          <div className="filter-header">
            <svg className="filter-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            <h3>Select Date Range</h3>
          </div>
          <div className="filter-inputs">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button className="btn-download-report" onClick={downloadCSV}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Download Excel
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card h">
            <div className="card-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="card-content">
              <div className="card-value">{getTotalHCount()}</div>
              <div className="card-label">Total H Entries</div>
            </div>
          </div>

          <div className="summary-card cy">
            <div className="card-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="card-content">
              <div className="card-value">{cyCount}</div>
              <div className="card-label">Cytology Tests</div>
            </div>
          </div>

          <div className="summary-card gp">
            <div className="card-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="card-content">
              <div className="card-value">{gpCount}</div>
              <div className="card-label">PAP SMEAR Tests</div>
            </div>
          </div>

          <div className="summary-card ihc">
            <div className="card-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="card-content">
              <div className="card-value">{markerStats.reduce((sum, stat) => sum + stat.total, 0)}</div>
              <div className="card-label">Total IHC Markers</div>
            </div>
          </div>
        </div>

        {/* H Entry Tests */}
        <div className="stats-card">
          <div className="stats-card-header">
            <h2 className="stats-card-title">H Entry Tests Breakdown</h2>
            <span className="stats-badge">{Object.keys(hStats).length} Types</span>
          </div>
          <div className="stats-grid">
            {Object.entries(hStats).map(([type, count]) => (
              <div key={type} className="stat-item">
                <div className="stat-item-label">{type}</div>
                <div className="stat-item-value">{count}</div>
                <div className="stat-item-bar">
                  <div 
                    className="stat-item-fill"
                    style={{ width: `${getTotalHCount() > 0 ? (count / getTotalHCount()) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IHC Markers Table */}
        <div className="stats-card">
          <div className="stats-card-header">
            <h2 className="stats-card-title">IHC Markers Analysis</h2>
            <span className="stats-badge">{markerStats.length} Unique Markers</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Marker Name</th>
                  <th>Total Count</th>
                  <th>Repeat Count</th>
                  <th>Usage %</th>
                </tr>
              </thead>
              <tbody>
                {markerStats.length > 0 ? (
                  markerStats.map((stat, idx) => {
                    const totalMarkers = markerStats.reduce((sum, s) => sum + s.total, 0);
                    const percentage = totalMarkers > 0 ? ((stat.total / totalMarkers) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx}>
                        <td className="rank-number">{idx + 1}</td>
                        <td className="marker-name">{stat.marker}</td>
                        <td>
                          <span className="count-badge total">{stat.total}</span>
                        </td>
                        <td>
                          <span className="count-badge repeat">{stat.repeat}</span>
                        </td>
                        <td>
                          <div className="percentage-bar">
                            <div className="percentage-fill" style={{ width: `${percentage}%` }} />
                            <span className="percentage-text">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      <div className="empty-state">
                        <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <p>No marker data for selected date range</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
