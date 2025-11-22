import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import './PatientsCY.css';

const PatientsCY = () => {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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
      const querySnapshot = await getDocs(collection(db, 'cyEntries'));
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.patientName?.toLowerCase().includes(term) ||
        entry.cyNumber?.toLowerCase().includes(term) ||
        entry.hospital?.toLowerCase().includes(term) ||
        entry.doctor?.toLowerCase().includes(term) ||
        entry.date?.includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle dates
      if (sortConfig.key === 'date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }

      // Handle strings
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

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

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Only admins can delete entries.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, 'cyEntries', id));
        await loadEntries();
        alert('Entry deleted successfully.');
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry.');
      }
    }
  };

  const downloadCSV = () => {
    const csvData = filteredEntries.map(entry => ({
      'Date': entry.date,
      'CY Number': entry.cyNumber,
      'Patient Name': entry.patientName,
      'Age': entry.age,
      'Gender': entry.gender,
      'Hospital': entry.hospital,
      'Doctor': entry.doctor,
      'Clinical Info': entry.clinicalInfo,
      'Test': entry.test || 'Cytology',
      'Entered By': entry.enteredBy
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients CY');
    XLSX.writeFile(wb, `patients_cy_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <h1 className="patients-title">Patients CY</h1>
            <p className="patients-subtitle">Cytology Patient Records</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge cy">
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
              placeholder="Search by name, CY number, hospital, doctor, or date..."
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
          <button className="btn-download cy" onClick={downloadCSV}>
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
                  <th onClick={() => handleSort('cyNumber')}>
                    <div className="th-content">
                      CY Number
                      <SortIcon column="cyNumber" />
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
                  <th>Clinical Info</th>
                  <th onClick={() => handleSort('enteredBy')}>
                    <div className="th-content">
                      Entered By
                      <SortIcon column="enteredBy" />
                    </div>
                  </th>
                  {isAdmin && <th className="actions-column">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {currentEntries.length > 0 ? (
                  currentEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>
                        <span className="cy-number">{entry.cyNumber}</span>
                      </td>
                      <td className="patient-name">{entry.patientName}</td>
                      <td>{entry.age}</td>
                      <td>{entry.gender}</td>
                      <td>{entry.hospital}</td>
                      <td>{entry.doctor}</td>
                      <td className="clinical-info">
                        {entry.clinicalInfo ? (
                          <span className="clinical-text">{entry.clinicalInfo}</span>
                        ) : (
                          <span className="no-data-text">—</span>
                        )}
                      </td>
                      <td className="entered-by">{entry.enteredBy}</td>
                      {isAdmin && (
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-delete"
                              onClick={() => handleDelete(entry.id)}
                              title="Delete Entry"
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? "10" : "9"} className="no-data">
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
    </div>
  );
};

export default PatientsCY;
