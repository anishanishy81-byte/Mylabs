import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { H_TESTS } from '../utils/constants';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';
import './PatientsH.css';

const PatientsH = () => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [newTest, setNewTest] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const entriesPerPage = 50;

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    filterAndSortEntries();
  }, [searchTerm, entries, sortConfig]);

  const loadEntries = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'hEntries'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

const filterAndSortEntries = () => {
  let filtered = [...entries];

  // Filter
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    
    filtered = filtered.filter(entry => {
      // Safety check for entry
      if (!entry) return false;

      try {
        // Patient Name - more flexible matching
        const nameMatch = (entry.patientName && typeof entry.patientName === 'string') 
          ? entry.patientName.toLowerCase().includes(term) 
          : false;
        
        // H Number
        const hNumberMatch = (entry.hNumber && typeof entry.hNumber === 'string')
          ? entry.hNumber.toLowerCase().includes(term)
          : false;
        
        // Hospital
        const hospitalMatch = (entry.hospital && typeof entry.hospital === 'string')
          ? entry.hospital.toLowerCase().includes(term)
          : false;
        
        // Doctor
        const doctorMatch = (entry.doctor && typeof entry.doctor === 'string')
          ? entry.doctor.toLowerCase().includes(term)
          : false;
        
        // Date
        const dateMatch = (entry.date && typeof entry.date === 'string')
          ? entry.date.includes(term)
          : false;
        
        // Tests - handle both array and string
        let testMatch = false;
        if (entry.tests) {
          if (Array.isArray(entry.tests)) {
            testMatch = entry.tests.some(test => 
              test && typeof test === 'string' && test.toLowerCase().includes(term)
            );
          } else if (typeof entry.tests === 'string') {
            testMatch = entry.tests.toLowerCase().includes(term);
          }
        }
        
        // Age
        const ageMatch = entry.age 
          ? entry.age.toString().toLowerCase().includes(term)
          : false;
        
        // Gender
        const genderMatch = (entry.gender && typeof entry.gender === 'string')
          ? entry.gender.toLowerCase().includes(term)
          : false;
        
        // Clinical Info
        const clinicalMatch = (entry.clinicalInfo && typeof entry.clinicalInfo === 'string')
          ? entry.clinicalInfo.toLowerCase().includes(term)
          : false;
        
        // Containers
        const containersMatch = (entry.containers && typeof entry.containers === 'string')
          ? entry.containers.toLowerCase().includes(term)
          : false;
        
        // Entered By
        const enteredByMatch = (entry.enteredBy && typeof entry.enteredBy === 'string')
          ? entry.enteredBy.toLowerCase().includes(term)
          : false;
        
        return nameMatch || hNumberMatch || hospitalMatch || doctorMatch || 
               dateMatch || testMatch || ageMatch || genderMatch || 
               clinicalMatch || containersMatch || enteredByMatch;
      } catch (error) {
        console.error('Error filtering entry:', error, entry);
        return false;
      }
    });
  }

  // Sort
  try {
    filtered.sort((a, b) => {
      if (!a || !b) return 0;

      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle arrays (tests)
      if (Array.isArray(aValue)) aValue = aValue.join(', ');
      if (Array.isArray(bValue)) bValue = bValue.join(', ');

      // Handle dates
      if (sortConfig.key === 'date') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      } else {
        // Handle strings for non-date fields
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  } catch (error) {
    console.error('Error sorting entries:', error);
  }

  setFilteredEntries(filtered);
  setCurrentPage(1);
};

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
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

  const handleAddTest = async () => {
    if (!newTest || !selectedEntry) return;

    try {
      const currentTests = Array.isArray(selectedEntry.tests) ? selectedEntry.tests : [selectedEntry.tests];
      await updateDoc(doc(db, 'hEntries', selectedEntry.id), {
        tests: [...currentTests, newTest]
      });
      
      setShowAddTestModal(false);
      setNewTest('');
      setSelectedEntry(null);
      await loadEntries();
      alert('Test added successfully.');
    } catch (error) {
      console.error('Error adding test:', error);
      alert('Error adding test.');
    }
  };

  const downloadCSV = () => {
    const csvData = filteredEntries.map(entry => ({
      'Date': entry.date,
      'H Number': entry.hNumber,
      'Patient Name': entry.patientName,
      'Age': entry.age,
      'Gender': entry.gender,
      'Hospital': entry.hospital,
      'Doctor': entry.doctor,
      'Clinical Info': entry.clinicalInfo,
      'Containers': entry.containers,
      'Tests': Array.isArray(entry.tests) ? entry.tests.join(', ') : entry.tests,
      'Entered By': entry.enteredBy
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients H');
    XLSX.writeFile(wb, `patients_h_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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
      <div className="patients-page">
        <div className="patients-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading patients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patients-page">
      <div className="patients-container">
        {/* Header */}
        <div className="patients-header">
          <div className="header-content">
            <h1 className="patients-title">Patients H</h1>
            <p className="patients-subtitle">Histopathology Patient Records</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="stat-number">{filteredEntries.length}</span>
              <span className="stat-label">Total Records</span>
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
              placeholder="Search by name, H number, hospital, doctor, test, or date..."
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
          <button className="btn-download" onClick={downloadCSV}>
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
                  <th onClick={() => handleSort('doctor')}>
                    <div className="th-content">
                      Doctor
                      <SortIcon column="doctor" />
                    </div>
                  </th>
                  <th>Tests</th>
                  <th onClick={() => handleSort('enteredBy')}>
                    <div className="th-content">
                      Entered By
                      <SortIcon column="enteredBy" />
                    </div>
                  </th>
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
                      <td>{entry.doctor}</td>
                      <td>
                        <div className="tests-cell">
                          {Array.isArray(entry.tests) 
                            ? entry.tests.map((test, idx) => (
                                <span key={idx} className="test-badge">{test}</span>
                              ))
                            : <span className="test-badge">{entry.tests}</span>
                          }
                        </div>
                      </td>
                      <td className="entered-by">{entry.enteredBy}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-action btn-add"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowAddTestModal(true);
                            }}
                            title="Add Test"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                            </svg>
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
                    <td colSpan="10" className="no-data">
                      <div className="empty-state">
                        <svg className="empty-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                        </svg>
                        <p>No patient records found</p>
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

      {/* Add Test Modal */}
      <Modal
        isOpen={showAddTestModal}
        onClose={() => {
          setShowAddTestModal(false);
          setNewTest('');
          setSelectedEntry(null);
        }}
        title="Add Test"
      >
        <div className="add-modal-content">
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
            <label className="form-label">Select Test</label>
            <select
              className="form-control"
              value={newTest}
              onChange={(e) => setNewTest(e.target.value)}
            >
              <option value="">Choose a test</option>
              {H_TESTS.map((test, idx) => (
                <option key={idx} value={test}>{test}</option>
              ))}
            </select>
          </div>
          
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAddTestModal(false);
                setNewTest('');
                setSelectedEntry(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAddTest}
              disabled={!newTest}
            >
              Add Test
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientsH;
