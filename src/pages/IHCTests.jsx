import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { IHC_MARKERS } from '../utils/constants';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';
import './IHCTests.css';

const IHCTests = () => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddMarkerModal, setShowAddMarkerModal] = useState(false);
  const [showViewMarkerModal, setShowViewMarkerModal] = useState(false);
  const [showAddNewMarkerModal, setShowAddNewMarkerModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedMarkers, setSelectedMarkers] = useState([]);
  const [markerDate, setMarkerDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableMarkers, setAvailableMarkers] = useState(IHC_MARKERS);
  const [newMarkerInput, setNewMarkerInput] = useState('');
  const [markerSearch, setMarkerSearch] = useState('');
  const [showMarkerDropdown, setShowMarkerDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const entriesPerPage = 50;
  const markerInputRef = useRef(null);

  useEffect(() => {
    loadEntries();
    loadMarkers();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [searchTerm, entries, sortConfig]);

  const loadEntries = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hEntries'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        markers: doc.data().markers || []
      }));
      // Filter to only show entries that have "IHC" in their tests
      const ihcEntries = data.filter(entry => {
        if (!entry.tests) return false;
        
        // Handle both array and string formats
        if (Array.isArray(entry.tests)) {
          return entry.tests.some(test => 
            test && typeof test === 'string' && test.toUpperCase().includes('IHC')
          );
        } else if (typeof entry.tests === 'string') {
          return entry.tests.toUpperCase().includes('IHC');
        }
        
        return false;
      });
      setEntries(ihcEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkers = async () => {
    try {
      const markerDoc = await getDoc(doc(db, 'settings', 'markers'));
      if (markerDoc.exists() && markerDoc.data().list) {
        setAvailableMarkers(markerDoc.data().list.sort());
      } else {
        setAvailableMarkers(IHC_MARKERS.sort());
      }
    } catch (error) {
      console.error('Error loading markers:', error);
    }
  };

  const filterAndSortEntries = () => {
    let filtered = [...entries];

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(entry => {
        if (!entry) return false;

        const nameMatch = (entry.patientName && typeof entry.patientName === 'string')
          ? entry.patientName.toLowerCase().includes(term)
          : false;
        const hNumberMatch = (entry.hNumber && typeof entry.hNumber === 'string')
          ? entry.hNumber.toLowerCase().includes(term)
          : false;
        const hospitalMatch = (entry.hospital && typeof entry.hospital === 'string')
          ? entry.hospital.toLowerCase().includes(term)
          : false;
        const doctorMatch = (entry.doctor && typeof entry.doctor === 'string')
          ? entry.doctor.toLowerCase().includes(term)
          : false;
        const dateMatch = (entry.date && typeof entry.date === 'string')
          ? entry.date.includes(term)
          : false;
        
        const markerMatch = entry.markers?.some(m => 
          m.markers?.some(marker => 
            marker && typeof marker === 'string' && marker.toLowerCase().includes(term)
          )
        ) || false;

        return nameMatch || hNumberMatch || hospitalMatch || doctorMatch || dateMatch || markerMatch;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (!a || !b) return 0;

      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'date') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      } else {
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEntries(filtered);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleAddMarkerClick = (entry) => {
    setSelectedEntry(entry);
    setSelectedMarkers([]);
    setMarkerDate(new Date().toISOString().split('T')[0]);
    setMarkerSearch('');
    setShowAddMarkerModal(true);
  };

  const handleMarkerSelect = (marker) => {
    setSelectedMarkers([...selectedMarkers, marker]);
    setMarkerSearch('');
    setShowMarkerDropdown(false);
  };

  const handleRemoveSelectedMarker = (index) => {
    setSelectedMarkers(selectedMarkers.filter((_, i) => i !== index));
  };

  const handleAddNewMarker = async () => {
    if (!newMarkerInput.trim()) {
      alert('Please enter a marker name.');
      return;
    }

    const newMarker = newMarkerInput.trim().toUpperCase();
    
    if (availableMarkers.includes(newMarker)) {
      alert('This marker already exists.');
      return;
    }
    
    const updatedMarkers = [...availableMarkers, newMarker].sort();
    setAvailableMarkers(updatedMarkers);
    
    try {
      await setDoc(doc(db, 'settings', 'markers'), { list: updatedMarkers });
      setNewMarkerInput('');
      setShowAddNewMarkerModal(false);
      alert('New marker added successfully.');
    } catch (error) {
      console.error('Error adding marker:', error);
      alert('Error adding marker.');
    }
  };

  const handleSaveMarkers = async () => {
    if (selectedMarkers.length === 0) {
      alert('Please select at least one marker.');
      return;
    }

    try {
      const markerEntry = {
        date: markerDate,
        markers: selectedMarkers
      };

      const currentMarkers = selectedEntry.markers || [];
      await updateDoc(doc(db, 'hEntries', selectedEntry.id), {
        markers: [...currentMarkers, markerEntry]
      });

      setShowAddMarkerModal(false);
      setSelectedMarkers([]);
      setSelectedEntry(null);
      await loadEntries();
      alert('Markers added successfully.');
    } catch (error) {
      console.error('Error adding markers:', error);
      alert('Error adding markers.');
    }
  };

  const handleViewMarkers = (entry) => {
    setSelectedEntry(entry);
    setShowViewMarkerModal(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Only admins can delete entries.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, 'hEntries', id));
        await loadEntries();
        alert('Entry deleted successfully.');
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry.');
      }
    }
  };

  const downloadCSV = () => {
    const csvData = filteredEntries.map(entry => {
      const markerData = entry.markers?.map(m => 
        `${m.date}: ${m.markers.join(', ')}`
      ).join(' | ') || '';

      return {
        'Date': entry.date,
        'H Number': entry.hNumber,
        'Patient Name': entry.patientName,
        'Age': entry.age,
        'Gender': entry.gender,
        'Hospital': entry.hospital,
        'Doctor': entry.doctor,
        'Clinical Info': entry.clinicalInfo,
        'Markers': markerData,
        'Entered By': entry.enteredBy
      };
    });

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IHC Tests');
    XLSX.writeFile(wb, `ihc_tests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredMarkers = availableMarkers.filter(marker =>
    marker.toLowerCase().includes(markerSearch.toLowerCase())
  );

  // Pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return (
        <svg className="sort-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"/>
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="sort-icon active" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
      </svg>
    ) : (
      <svg className="sort-icon active" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd"/>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="ihc-page">
        <div className="ihc-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading IHC tests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ihc-page">
      <div className="ihc-container">
        {/* Header */}
        <div className="ihc-header">
          <div className="header-content">
            <h1 className="ihc-title">IHC Tests</h1>
            <p className="ihc-subtitle">Immunohistochemistry Marker Management</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge ihc">
              <span className="stat-number">{filteredEntries.length}</span>
              <span className="stat-label">H Entries</span>
            </div>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="search-actions-bar">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, H number, hospital, doctor, or marker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              </button>
            )}
          </div>
          <button className="btn-download ihc" onClick={downloadCSV}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            Download Excel
          </button>
        </div>

        {/* Table Card */}
        <div className="table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')}>
                    <div className="th-content">
                      Date
                      <SortIcon column="date" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('hNumber')}>
                    <div className="th-content">
                      H Number
                      <SortIcon column="hNumber" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('patientName')}>
                    <div className="th-content">
                      Patient Name
                      <SortIcon column="patientName" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('age')}>
                    <div className="th-content">
                      Age
                      <SortIcon column="age" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('gender')}>
                    <div className="th-content">
                      Gender
                      <SortIcon column="gender" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('hospital')}>
                    <div className="th-content">
                      Hospital
                      <SortIcon column="hospital" />
                    </div>
                  </th>
                  <th>IHC Markers</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentEntries.length > 0 ? (
                  currentEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>
                        <span className="h-number">{entry.hNumber}</span>
                      </td>
                      <td className="patient-name">{entry.patientName}</td>
                      <td>{entry.age}</td>
                      <td>{entry.gender}</td>
                      <td>{entry.hospital}</td>
                      <td>
                        {entry.markers && entry.markers.length > 0 ? (
                          <div className="markers-history">
                            {entry.markers.map((markerEntry, idx) => (
                              <div key={idx} className="marker-entry">
                                <div className="marker-date">{markerEntry.date}</div>
                                <div className="marker-list">
                                  {markerEntry.markers.map((marker, mIdx) => (
                                    <span key={mIdx} className="marker-badge">{marker}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="no-markers">No markers</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-add-marker"
                            onClick={() => handleAddMarkerClick(entry)}
                            title="Add IHC Markers"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                            </svg>
                            Add
                          </button>
                          <button
                            className="btn-view-marker"
                            onClick={() => handleViewMarkers(entry)}
                            title="View Markers"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                            </svg>
                            View
                          </button>
                          {isAdmin && (
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handleDelete(entry.id)}
                              title="Delete Entry"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      <div className="empty-state">
                        <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <p>No H entries found</p>
                        {searchTerm && <p className="empty-subtext">Try adjusting your search</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Previous
              </button>
              
              <div className="pagination-info">
                Page <span className="current-page">{currentPage}</span> of <span>{totalPages}</span>
              </div>
              
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Markers Modal */}
      <Modal
        isOpen={showAddMarkerModal}
        onClose={() => {
          setShowAddMarkerModal(false);
          setSelectedEntry(null);
          setSelectedMarkers([]);
          setMarkerSearch('');
        }}
        title="Add IHC Markers"
      >
        <div className="add-marker-modal-content">
          {selectedEntry && (
            <div className="patient-info-box">
              <div className="info-row">
                <span className="info-label">Patient:</span>
                <span className="info-value">{selectedEntry.patientName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">H Number:</span>
                <span className="info-value">{selectedEntry.hNumber}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={markerDate}
              onChange={(e) => setMarkerDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Search Markers ({selectedMarkers.length} selected)
            </label>
            <div className="searchable-dropdown">
              <input
                ref={markerInputRef}
                type="text"
                className="form-control"
                placeholder="Type to search markers..."
                value={markerSearch}
                onChange={(e) => {
                  setMarkerSearch(e.target.value);
                  setShowMarkerDropdown(true);
                }}
                onFocus={() => setShowMarkerDropdown(true)}
              />
              {showMarkerDropdown && (
                <div className="dropdown-menu">
                  {filteredMarkers.length > 0 ? (
                    filteredMarkers.map((marker, idx) => (
                      <div
                        key={idx}
                        className="dropdown-item"
                        onClick={() => handleMarkerSelect(marker)}
                      >
                        {marker}
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No markers found</div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-add-new"
              onClick={() => setShowAddNewMarkerModal(true)}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Add New Marker
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Selected Markers</label>
            <div className="selected-markers-grid">
              {selectedMarkers.length === 0 ? (
                <p className="no-selection">No markers selected yet</p>
              ) : (
                selectedMarkers.map((marker, index) => (
                  <div key={index} className="marker-tag">
                    <span>{marker}</span>
                    <button
                      onClick={() => handleRemoveSelectedMarker(index)}
                      className="marker-remove"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAddMarkerModal(false);
                setSelectedEntry(null);
                setSelectedMarkers([]);
                setMarkerSearch('');
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveMarkers}
              disabled={selectedMarkers.length === 0}
            >
              Save {selectedMarkers.length} Marker{selectedMarkers.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Markers Modal */}
      <Modal
        isOpen={showViewMarkerModal}
        onClose={() => {
          setShowViewMarkerModal(false);
          setSelectedEntry(null);
        }}
        title="IHC Markers History"
      >
        <div className="view-marker-modal-content">
          {selectedEntry && (
            <>
              <div className="patient-info-box">
                <div className="info-row">
                  <span className="info-label">Patient:</span>
                  <span className="info-value">{selectedEntry.patientName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">H Number:</span>
                  <span className="info-value">{selectedEntry.hNumber}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Age:</span>
                  <span className="info-value">{selectedEntry.age}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Gender:</span>
                  <span className="info-value">{selectedEntry.gender}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Hospital:</span>
                  <span className="info-value">{selectedEntry.hospital}</span>
                </div>
              </div>

              <div className="markers-history-section">
                <h3 className="section-title">Markers by Date</h3>
                {selectedEntry.markers && selectedEntry.markers.length > 0 ? (
                  <div className="markers-timeline">
                    {selectedEntry.markers
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((markerEntry, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-date">
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                            </svg>
                            {new Date(markerEntry.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="timeline-markers">
                            {markerEntry.markers.map((marker, idx) => (
                              <span key={idx} className="marker-badge-large">{marker}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="no-markers-state">
                    <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <p>No markers have been added yet</p>
                    <p className="empty-subtext">Click "Add" to add IHC markers to this entry</p>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowViewMarkerModal(false);
                    setSelectedEntry(null);
                  }}
                >
                  Close
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowViewMarkerModal(false);
                    handleAddMarkerClick(selectedEntry);
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                  </svg>
                  Add More Markers
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add New Marker Modal */}
      <Modal
        isOpen={showAddNewMarkerModal}
        onClose={() => {
          setShowAddNewMarkerModal(false);
          setNewMarkerInput('');
        }}
        title="Add New Marker"
      >
        <div className="add-modal-content">
          <div className="form-group">
            <label className="form-label">Marker Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter marker name (e.g., CD20)"
              value={newMarkerInput}
              onChange={(e) => setNewMarkerInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAddNewMarkerModal(false);
                setNewMarkerInput('');
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAddNewMarker}
              disabled={!newMarkerInput.trim()}
            >
              Add Marker
            </button>
          </div>
        </div>
      </Modal>

      {/* Click outside to close dropdown */}
      {showMarkerDropdown && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowMarkerDropdown(false)}
        />
      )}
    </div>
  );
};

export default IHCTests;