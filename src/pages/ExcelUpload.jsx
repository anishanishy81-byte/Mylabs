import React, { useState } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import './ExcelUpload.css';

const ExcelUpload = () => {
  const { currentUser } = useAuth();
  const [selectedType, setSelectedType] = useState('H');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const requiredFields = {
    H: ['Date', 'H Number', 'Patient Name', 'Age', 'Gender', 'Hospital', 'Doctor', 'Clinical Info', 'Containers', 'Test'],
    CY: ['Date', 'CY Number', 'Patient Name', 'Age', 'Gender', 'Hospital', 'Doctor', 'Clinical Info'],
    GP: ['Date', 'GP Number', 'Patient Name', 'Age', 'Gender', 'Hospital', 'Doctor', 'Clinical Info']
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPreviewData(jsonData);
        setShowPreviewModal(true);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Error parsing Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = (data) => {
    const errors = [];
    const required = requiredFields[selectedType];

    data.forEach((row, index) => {
      required.forEach(field => {
        if (!row[field]) {
          errors.push(`Row ${index + 2}: Missing ${field}`);
        }
      });
    });

    return errors;
  };

  const handleUpload = async () => {
    const errors = validateData(previewData);
    
    if (errors.length > 0) {
      alert(`Validation errors found:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''}`);
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of previewData) {
        try {
          let entry;
          let collectionName;

          if (selectedType === 'H') {
            collectionName = 'hEntries';
            entry = {
              date: row['Date'],
              hNumber: row['H Number'],
              patientName: row['Patient Name'],
              age: row['Age'],
              gender: row['Gender'],
              hospital: row['Hospital'],
              doctor: row['Doctor'],
              clinicalInfo: row['Clinical Info'] || '',
              containers: row['Containers'] || '',
              tests: row['Test'] ? [row['Test']] : [],
              enteredBy: currentUser.email,
              timestamp: new Date()
            };
          } else if (selectedType === 'CY') {
            collectionName = 'cyEntries';
            entry = {
              date: row['Date'],
              cyNumber: row['CY Number'],
              patientName: row['Patient Name'],
              age: row['Age'],
              gender: row['Gender'],
              hospital: row['Hospital'],
              doctor: row['Doctor'],
              clinicalInfo: row['Clinical Info'] || '',
              test: 'Cytology',
              enteredBy: currentUser.email,
              timestamp: new Date()
            };
          } else if (selectedType === 'GP') {
            collectionName = 'gpEntries';
            entry = {
              date: row['Date'],
              gpNumber: row['GP Number'],
              patientName: row['Patient Name'],
              age: row['Age'],
              gender: row['Gender'],
              hospital: row['Hospital'],
              doctor: row['Doctor'],
              clinicalInfo: row['Clinical Info'] || '',
              test: 'PAP SMEAR',
              enteredBy: currentUser.email,
              timestamp: new Date()
            };
          }

          await addDoc(collection(db, collectionName), entry);
          successCount++;
        } catch (error) {
          console.error('Error adding entry:', error);
          errorCount++;
        }
      }

      setUploadResult({
        success: successCount,
        errors: errorCount,
        total: previewData.length
      });

      setShowPreviewModal(false);
      setFile(null);
      setPreviewData([]);
    } catch (error) {
      console.error('Error during upload:', error);
      alert('Error during upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [requiredFields[selectedType].reduce((obj, field) => {
      obj[field] = '';
      return obj;
    }, {})];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedType} Template`);
    XLSX.writeFile(wb, `${selectedType}_entry_template.xlsx`);
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        {/* Header */}
        <div className="upload-header">
          <div className="header-content">
            <h1 className="upload-title">Excel Upload</h1>
            <p className="upload-subtitle">Bulk Import Patient Records from Excel</p>
          </div>
        </div>

        {/* Upload Card */}
        <div className="upload-card">
          {/* Type Selection */}
          <div className="upload-section">
            <h3 className="section-title">Select Entry Type</h3>
            <div className="type-buttons">
              <button
                className={`type-btn ${selectedType === 'H' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedType('H');
                  setFile(null);
                  setPreviewData([]);
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                </svg>
                <span>H Entry</span>
                <span className="type-label">Histopathology</span>
              </button>

              <button
                className={`type-btn cy ${selectedType === 'CY' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedType('CY');
                  setFile(null);
                  setPreviewData([]);
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                <span>CY Entry</span>
                <span className="type-label">Cytology</span>
              </button>

              <button
                className={`type-btn gp ${selectedType === 'GP' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedType('GP');
                  setFile(null);
                  setPreviewData([]);
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd"/>
                </svg>
                <span>GP Entry</span>
                <span className="type-label">Gynecological</span>
              </button>
            </div>
          </div>

          {/* Template Download */}
          <div className="upload-section">
            <h3 className="section-title">Download Template</h3>
            <p className="section-description">
              Download the Excel template with required columns for {selectedType} entries
            </p>
            <button className="btn-download-template" onClick={downloadTemplate}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
              Download {selectedType} Template
            </button>
          </div>

          {/* Required Fields */}
          <div className="upload-section">
            <h3 className="section-title">Required Fields</h3>
            <div className="fields-list">
              {requiredFields[selectedType].map((field, idx) => (
                <span key={idx} className="field-badge">{field}</span>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="upload-section">
            <h3 className="section-title">Upload Excel File</h3>
            <div className="file-upload-area">
              <input
                type="file"
                id="file-input"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-upload-label">
                {file ? (
                  <>
                    <svg className="file-icon success" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {previewData.length} rows found
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="file-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="upload-text">Click to select Excel file</span>
                    <span className="upload-hint">or drag and drop</span>
                    <span className="upload-formats">XLSX, XLS files supported</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Instructions */}
          <div className="info-box">
            <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div className="info-content">
              <h4 className="info-title">Upload Instructions</h4>
              <ul className="info-list">
                <li>Download the template for the selected entry type</li>
                <li>Fill in all required fields in the Excel file</li>
                <li>Ensure column names match exactly with the template</li>
                <li>Upload the completed file and preview the data</li>
                <li>Confirm to import all records into the system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="result-card">
            <div className="result-header">
              <svg className="result-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <h3 className="result-title">Upload Complete</h3>
            </div>
            <div className="result-stats">
              <div className="result-stat success">
                <span className="stat-value">{uploadResult.success}</span>
                <span className="stat-label">Successful</span>
              </div>
              {uploadResult.errors > 0 && (
                <div className="result-stat error">
                  <span className="stat-value">{uploadResult.errors}</span>
                  <span className="stat-label">Failed</span>
                </div>
              )}
              <div className="result-stat total">
                <span className="stat-value">{uploadResult.total}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
            <button 
              className="btn-close-result"
              onClick={() => setUploadResult(null)}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setFile(null);
          setPreviewData([]);
        }}
        title="Preview Data"
      >
        <div className="preview-modal-content">
          <div className="preview-info">
            <p><strong>Entry Type:</strong> {selectedType}</p>
            <p><strong>Total Rows:</strong> {previewData.length}</p>
          </div>

          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  {previewData.length > 0 && Object.keys(previewData[0]).map((key, idx) => (
                    <th key={idx}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((value, vIdx) => (
                      <td key={vIdx}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <div className="preview-note">
                Showing first 10 of {previewData.length} rows
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowPreviewModal(false);
                setFile(null);
                setPreviewData([]);
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle className="spinner-circle" cx="12" cy="12" r="10" fill="none" strokeWidth="3"/>
                  </svg>
                  Uploading...
                </>
              ) : (
                `Upload ${previewData.length} Entries`
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExcelUpload;
