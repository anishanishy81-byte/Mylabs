import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { H_TESTS } from '../utils/constants';
import Modal from '../components/Modal';
import { sendToGoogleSheet } from '../services/googleSheets';
import './HEntry.css';

const HEntry = () => {
  const { currentUser } = useAuth();

  // Entry fields
  const [hNumber, setHNumber] = useState('1499/25');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [containers, setContainers] = useState('');
  const [tests, setTests] = useState(['']);

  // UI states
  const [loading, setLoading] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Dropdown data and state
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Searchable dropdown states
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // Add new modal controls
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');

  const hospitalInputRef = useRef(null);
  const doctorInputRef = useRef(null);

  useEffect(() => {
    loadHNumber();
    loadDropdownData();
  }, []);

  // Load current H number counter
  const loadHNumber = async () => {
    try {
      const counterDoc = await getDoc(doc(db, 'counters', 'hEntry'));
      if (counterDoc.exists()) {
        setHNumber(counterDoc.data().current);
      }
    } catch (error) {
      console.error('Error loading H number:', error);
    }
  };

  // Load hospitals and doctors from Firestore + merge defaults
  const loadDropdownData = async () => {
    try {
      // Load hospitals
      const hospitalDoc = await getDoc(doc(db, 'settings', 'hospitals'));
      let loadedHospitals = [];
      if (hospitalDoc.exists() && hospitalDoc.data().list) {
        loadedHospitals = hospitalDoc.data().list;
      }
      const defaultHospitals = ['Apollo Hospital', 'Fortis Hospital', 'Max Hospital', 'AIIMS', 'Manipal Hospital'];
      const mergedHospitals = [...new Set([...defaultHospitals, ...loadedHospitals])].sort();
      setHospitals(mergedHospitals);

      // Load doctors
      const doctorDoc = await getDoc(doc(db, 'settings', 'doctors'));
      let loadedDoctors = [];
      if (doctorDoc.exists() && doctorDoc.data().list) {
        loadedDoctors = doctorDoc.data().list;
      }
      const defaultDoctors = ['Dr. Sharma', 'Dr. Kumar', 'Dr. Patel', 'Dr. Singh', 'Dr. Reddy'];
      const mergedDoctors = [...new Set([...defaultDoctors, ...loadedDoctors])].sort();
      setDoctors(mergedDoctors);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  // Handle saving new hospital to Firestore and update dropdown
  const handleAddNewHospital = async () => {
    if (!newHospitalName.trim()) {
      alert('Please enter a hospital name.');
      return;
    }
    try {
      const hospitalDocRef = doc(db, 'settings', 'hospitals');
      const hospitalDoc = await getDoc(hospitalDocRef);
      const currentList = hospitalDoc.exists() && hospitalDoc.data().list ? hospitalDoc.data().list : [];
      if (currentList.includes(newHospitalName.trim())) {
        alert('This hospital already exists.');
        return;
      }
      const updatedHospitals = [...new Set([...currentList, newHospitalName.trim()])].sort();
      await setDoc(hospitalDocRef, {
        list: updatedHospitals,
        updatedBy: currentUser.email,
        updatedAt: new Date()
      });
      setHospitals(updatedHospitals);
      setHospital(newHospitalName.trim());
      setHospitalSearch(newHospitalName.trim());
      setNewHospitalName('');
      setShowAddHospitalModal(false);
      alert('Hospital added successfully and synced.');
    } catch (error) {
      alert('Failed to save hospital. Try again.');
      console.error(error);
    }
  };

  // Handle saving new doctor to Firestore and update dropdown
  const handleAddNewDoctor = async () => {
    if (!newDoctorName.trim()) {
      alert('Please enter a doctor name.');
      return;
    }
    try {
      const doctorDocRef = doc(db, 'settings', 'doctors');
      const doctorDoc = await getDoc(doctorDocRef);
      const currentList = doctorDoc.exists() && doctorDoc.data().list ? doctorDoc.data().list : [];
      if (currentList.includes(newDoctorName.trim())) {
        alert('This doctor already exists.');
        return;
      }
      const updatedDoctors = [...new Set([...currentList, newDoctorName.trim()])].sort();
      await setDoc(doctorDocRef, {
        list: updatedDoctors,
        updatedBy: currentUser.email,
        updatedAt: new Date()
      });
      setDoctors(updatedDoctors);
      setDoctor(newDoctorName.trim());
      setDoctorSearch(newDoctorName.trim());
      setNewDoctorName('');
      setShowAddDoctorModal(false);
      alert('Doctor added successfully and synced.');
    } catch (error) {
      alert('Failed to save doctor. Try again.');
      console.error(error);
    }
  };

  // Filters for dropdown search
  const filteredHospitals = hospitals.filter(h => h.toLowerCase().includes(hospitalSearch.toLowerCase()));
  const filteredDoctors = doctors.filter(d => d.toLowerCase().includes(doctorSearch.toLowerCase()));

  // Handlers for dropdown selections
  const handleHospitalSelect = (val) => {
    setHospital(val);
    setHospitalSearch(val);
    setShowHospitalDropdown(false);
  };

  const handleDoctorSelect = (val) => {
    setDoctor(val);
    setDoctorSearch(val);
    setShowDoctorDropdown(false);
  };

  // Manage tests inputs
  const handleAddTest = () => {
    setTests([...tests, '']);
  };

  const handleTestChange = (index, value) => {
    const newTests = [...tests];
    newTests[index] = value;
    setTests(newTests);
  };

  const handleRemoveTest = (index) => {
    if (tests.length > 1) {
      setTests(tests.filter((_, i) => i !== index));
    }
  };

  // Increment H number
  const incrementHNumber = async () => {
    const parts = hNumber.split('/');
    const num = parseInt(parts[0]) + 1;
    const year = parts[1];
    const newNumber = `${num}/${year}`;

    await setDoc(doc(db, 'counters', 'hEntry'), { current: newNumber });
    setHNumber(newNumber);
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newEntry = {
        hNumber,
        date,
        patientName,
        age,
        gender,
        hospital,
        doctor,
        clinicalInfo,
        containers,
        tests: tests.filter(t => t),
        enteredBy: currentUser.email,
        timestamp: new Date()
      };
      await addDoc(collection(db, 'hEntries'), newEntry);

      // Send to Google Sheets if URL present
      const sheetUrlDoc = await getDoc(doc(db, 'settings', 'googleSheets'));
      if (sheetUrlDoc.exists()) {
        const url = sheetUrlDoc.data().hEntryUrl;
        if (url) await sendToGoogleSheet(url, newEntry);
      }

      await incrementHNumber();

      setSavedEntry({ name: patientName, number: hNumber });
      setShowModal(true);

      // Reset form
      setPatientName('');
      setAge('');
      setGender('Male');
      setHospital('');
      setHospitalSearch('');
      setDoctor('');
      setDoctorSearch('');
      setClinicalInfo('');
      setContainers('');
      setTests(['']);
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-page">
      <div className="entry-container">
        {/* Header */}
        <div className="entry-header">
          <div className="header-content">
            <h1 className="entry-title">H Entry</h1>
            <p className="entry-subtitle">Histopathology Specimen Entry</p>
          </div>
          <div className="header-badge">
            <span className="badge-number">{hNumber}</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {/* Entry Details */}
            <div className="form-section">
              <h3 className="section-title">Entry Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">H Number</label>
                  <input type="text" className="form-control disabled" value={hNumber} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="form-section">
              <h3 className="section-title">Patient Information</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Patient Name *</label>
                  <input type="text" className="form-control" value={patientName} onChange={e => setPatientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input type="number" className="form-control" value={age} onChange={e => setAge(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select className="form-control" value={gender} onChange={e => setGender(e.target.value)} required>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hospital & Doctor */}
            <div className="form-section">
              <h3 className="section-title">Hospital & Doctor Details</h3>
              <div className="form-grid">
                {/* Hospital Dropdown */}
                <div className="form-group">
                  <label className="form-label">Hospital *</label>
                  <div className="searchable-dropdown">
                    <input
                      ref={hospitalInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Search hospital..."
                      value={hospitalSearch || hospital}
                      onChange={e => {
                        setHospitalSearch(e.target.value);
                        setShowHospitalDropdown(true);
                      }}
                      onFocus={() => setShowHospitalDropdown(true)}
                      required
                    />
                    {showHospitalDropdown && (
                      <div className="dropdown-menu">
                        {filteredHospitals.length > 0 ? (
                          filteredHospitals.map((item, idx) => (
                            <div key={idx} className="dropdown-item" onClick={() => handleHospitalSelect(item)}>
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-empty">No hospitals found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" className="btn-add-new" onClick={() => setShowAddHospitalModal(true)}>
                    Add New Hospital
                  </button>
                </div>

                {/* Doctor Dropdown */}
                <div className="form-group">
                  <label className="form-label">Doctor *</label>
                  <div className="searchable-dropdown">
                    <input
                      ref={doctorInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Search doctor..."
                      value={doctorSearch || doctor}
                      onChange={e => {
                        setDoctorSearch(e.target.value);
                        setShowDoctorDropdown(true);
                      }}
                      onFocus={() => setShowDoctorDropdown(true)}
                      required
                    />
                    {showDoctorDropdown && (
                      <div className="dropdown-menu">
                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map((item, idx) => (
                            <div key={idx} className="dropdown-item" onClick={() => handleDoctorSelect(item)}>
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="dropdown-empty">No doctors found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" className="btn-add-new" onClick={() => setShowAddDoctorModal(true)}>
                    Add New Doctor
                  </button>
                </div>
              </div>
            </div>

            {/* Clinical Info */}
            <div className="form-section">
              <h3 className="section-title">Clinical Information</h3>
              <textarea className="form-control" rows="3" value={clinicalInfo} onChange={e => setClinicalInfo(e.target.value)} placeholder="Enter clinical info" />
            </div>

            {/* Containers */}
            <div className="form-section">
              <h3 className="section-title">Containers</h3>
              <input type="text" className="form-control" value={containers} onChange={e => setContainers(e.target.value)} placeholder="Enter container details" />
            </div>

            {/* Tests */}
            <div className="form-section">
              <h3 className="section-title">Tests *</h3>
              {tests.map((test, index) => (
                <div key={index} className="test-item">
                  <select className="form-control" value={test} onChange={e => handleTestChange(index, e.target.value)} required>
                    <option value="">Select Test</option>
                    {H_TESTS.map((t, idx) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                  </select>
                  {tests.length > 1 && (
                    <button type="button" className="btn-remove" onClick={() => handleRemoveTest(index)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-add-test" onClick={handleAddTest}>
                Add Another Test
              </button>
            </div>

            {/* Submit */}
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Entry Saved">
        {savedEntry && (
          <div>
            <h3>Entry Created Successfully</h3>
            <p><strong>Patient Name:</strong> {savedEntry.name}</p>
            <p><strong>H Number:</strong> {savedEntry.number}</p>
          </div>
        )}
      </Modal>

      {/* Add Hospital Modal */}
      <Modal isOpen={showAddHospitalModal} onClose={() => setShowAddHospitalModal(false)} title="Add New Hospital">
        <div className="form-group">
          <label>Hospital Name</label>
          <input type="text" className="form-control" value={newHospitalName} onChange={e => setNewHospitalName(e.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => { setShowAddHospitalModal(false); setNewHospitalName(''); }}>Cancel</button>
          <button className="btn-primary" onClick={handleAddNewHospital} disabled={!newHospitalName.trim()}>Add Hospital</button>
        </div>
      </Modal>

      {/* Add Doctor Modal */}
      <Modal isOpen={showAddDoctorModal} onClose={() => setShowAddDoctorModal(false)} title="Add New Doctor">
        <div className="form-group">
          <label>Doctor Name</label>
          <input type="text" className="form-control" value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => { setShowAddDoctorModal(false); setNewDoctorName(''); }}>Cancel</button>
          <button className="btn-primary" onClick={handleAddNewDoctor} disabled={!newDoctorName.trim()}>Add Doctor</button>
        </div>
      </Modal>

      {/* Click outside dropdown overlay */}
      {(showHospitalDropdown || showDoctorDropdown) && (
        <div className="dropdown-overlay" onClick={() => { setShowHospitalDropdown(false); setShowDoctorDropdown(false); }} />
      )}
    </div>
  );
};

export default HEntry;
