import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { sendToGoogleSheet } from '../services/googleSheets';
import './CYEntry.css';

const defaultHospitals = [
  'Apollo Hospital',
  'Fortis Hospital',
  'Max Hospital',
  'AIIMS',
  'Manipal Hospital',
];

const defaultDoctors = [
  'Dr. Sharma',
  'Dr. Kumar',
  'Dr. Patel',
  'Dr. Singh',
  'Dr. Reddy',
];

const CYEntry = () => {
  const { currentUser } = useAuth();
  const [cyNumber, setCyNumber] = useState('0034/25');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');
  const [clinicalInfo, setClinicalInfo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dropdown search and visibility states
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newHospitalName, setNewHospitalName] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');

  const hospitalInputRef = useRef(null);
  const doctorInputRef = useRef(null);

  useEffect(() => {
    loadCYNumber();
    loadDropdownData();
  }, []);

  const loadCYNumber = async () => {
    try {
      const counterDoc = await getDoc(doc(db, 'counters', 'cyEntry'));
      if (counterDoc.exists()) {
        setCyNumber(counterDoc.data().current);
      }
    } catch (error) {
      console.error('Error loading CY number:', error);
    }
  };

  const loadDropdownData = async () => {
    try {
      const hospitalDoc = await getDoc(doc(db, 'settings', 'hospitals'));
      let loadedHospitals = hospitalDoc.exists() && hospitalDoc.data().list
        ? hospitalDoc.data().list
        : [];
      const mergedHospitals = [...new Set([...defaultHospitals, ...loadedHospitals])].sort();
      setHospitals(mergedHospitals);

      const doctorDoc = await getDoc(doc(db, 'settings', 'doctors'));
      let loadedDoctors = doctorDoc.exists() && doctorDoc.data().list
        ? doctorDoc.data().list
        : [];
      const mergedDoctors = [...new Set([...defaultDoctors, ...loadedDoctors])].sort();
      setDoctors(mergedDoctors);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const incrementCYNumber = async () => {
    const parts = cyNumber.split('/');
    const num = parseInt(parts[0]) + 1;
    const year = parts[1];
    const newNumber = `${String(num).padStart(4, '0')}/${year}`;

    try {
      await setDoc(doc(db, 'counters', 'cyEntry'), { current: newNumber });
      setCyNumber(newNumber);
    } catch (error) {
      console.error('Error incrementing CY number:', error);
    }
  };

  // Filtered lists for searchable dropdowns
  const filteredHospitals = hospitals.filter(h =>
    h.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d =>
    d.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  // Dropdown select handlers
  const handleHospitalSelect = (selectedHospital) => {
    setHospital(selectedHospital);
    setHospitalSearch(selectedHospital);
    setShowHospitalDropdown(false);
  };

  const handleDoctorSelect = (selectedDoctor) => {
    setDoctor(selectedDoctor);
    setDoctorSearch(selectedDoctor);
    setShowDoctorDropdown(false);
  };

  // Save new hospital and update Firestore and local state
  const handleAddNewHospital = async () => {
    if (!newHospitalName.trim()) {
      alert('Please enter a hospital name.');
      return;
    }
    const name = newHospitalName.trim();
    if (hospitals.includes(name)) {
      alert('This hospital already exists.');
      return;
    }

    try {
      const hospitalRef = doc(db, 'settings', 'hospitals');
      const hospitalDoc = await getDoc(hospitalRef);
      const currentList = hospitalDoc.exists() && hospitalDoc.data().list ? hospitalDoc.data().list : [];
      const updatedHospitals = [...new Set([...currentList, name])].sort();

      await setDoc(hospitalRef, {
        list: updatedHospitals,
        updatedBy: currentUser.email,
        updatedAt: new Date()
      });

      setHospitals(updatedHospitals);
      setHospital(name);
      setHospitalSearch(name);
      setNewHospitalName('');
      setShowAddHospitalModal(false);
      alert('Hospital saved and available in all entry pages.');
    } catch (error) {
      alert('Failed to save hospital. Please try again.');
      console.error(error);
    }
  };

  // Save new doctor and update Firestore and local state
  const handleAddNewDoctor = async () => {
    if (!newDoctorName.trim()) {
      alert('Please enter a doctor name.');
      return;
    }
    const name = newDoctorName.trim();
    if (doctors.includes(name)) {
      alert('This doctor already exists.');
      return;
    }

    try {
      const doctorRef = doc(db, 'settings', 'doctors');
      const doctorDoc = await getDoc(doctorRef);
      const currentList = doctorDoc.exists() && doctorDoc.data().list ? doctorDoc.data().list : [];
      const updatedDoctors = [...new Set([...currentList, name])].sort();

      await setDoc(doctorRef, {
        list: updatedDoctors,
        updatedBy: currentUser.email,
        updatedAt: new Date()
      });

      setDoctors(updatedDoctors);
      setDoctor(name);
      setDoctorSearch(name);
      setNewDoctorName('');
      setShowAddDoctorModal(false);
      alert('Doctor saved and available in all entry pages.');
    } catch (error) {
      alert('Failed to save doctor. Please try again.');
      console.error(error);
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newEntry = {
        cyNumber,
        date,
        patientName,
        age,
        gender,
        hospital,
        doctor,
        clinicalInfo,
        test: 'Cytology',
        enteredBy: currentUser.email,
        timestamp: new Date()
      };

      await addDoc(collection(db, 'cyEntries'), newEntry);

      const sheetUrlDoc = await getDoc(doc(db, 'settings', 'googleSheets'));
      if (sheetUrlDoc.exists() && sheetUrlDoc.data().cyEntryUrl) {
        await sendToGoogleSheet(sheetUrlDoc.data().cyEntryUrl, newEntry);
      }

      await incrementCYNumber();

      setSavedEntry({ name: patientName, number: cyNumber });
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
            <h1 className="entry-title">CY Entry</h1>
            <p className="entry-subtitle">Cytology Specimen Entry</p>
          </div>
          <div className="header-badge cy">
            <span className="badge-number">{cyNumber}</span>
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
                  <label className="form-label">CY Number</label>
                  <input type="text" className="form-control disabled" value={cyNumber} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Patient Information */}
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
                      onChange={e => { setHospitalSearch(e.target.value); setShowHospitalDropdown(true); }}
                      onFocus={() => setShowHospitalDropdown(true)}
                      required
                    />
                    {showHospitalDropdown && (
                      <div className="dropdown-menu">
                        {filteredHospitals.length > 0 ? (
                          filteredHospitals.map((h, idx) => (
                            <div key={idx} className="dropdown-item" onClick={() => handleHospitalSelect(h)}>
                              {h}
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
                      onChange={e => { setDoctorSearch(e.target.value); setShowDoctorDropdown(true); }}
                      onFocus={() => setShowDoctorDropdown(true)}
                      required
                    />
                    {showDoctorDropdown && (
                      <div className="dropdown-menu">
                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map((d, idx) => (
                            <div key={idx} className="dropdown-item" onClick={() => handleDoctorSelect(d)}>
                              {d}
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

            {/* Clinical Information */}
            <div className="form-section">
              <h3 className="section-title">Clinical Information</h3>
              <textarea className="form-control" rows="4" value={clinicalInfo} onChange={e => setClinicalInfo(e.target.value)} placeholder="Enter clinical information" />
            </div>

            {/* Submit */}
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Entry Saved Successfully">
        {savedEntry && (
          <div>
            <h3>Entry Created Successfully</h3>
            <p><strong>Patient Name:</strong> {savedEntry.name}</p>
            <p><strong>CY Number:</strong> {savedEntry.number}</p>
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

      {/* Dropdown overlay to close dropdown on outside click */}
      {(showHospitalDropdown || showDoctorDropdown) && (
        <div className="dropdown-overlay" onClick={() => {
          setShowHospitalDropdown(false);
          setShowDoctorDropdown(false);
        }} />
      )}
    </div>
  );
};

export default CYEntry;
