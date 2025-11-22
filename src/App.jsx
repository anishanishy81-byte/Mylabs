import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import HEntry from './pages/HEntry';
import CYEntry from './pages/CYEntry';
import GPEntry from './pages/GPEntry';
import PatientsH from './pages/PatientsH';
import PatientsCY from './pages/PatientsCY';
import PatientsGP from './pages/PatientsGP';
import IHCTests from './pages/IHCTests';
import ExcelUpload from './pages/ExcelUpload';
import Statistics from './pages/Statistics';
import Admin from './pages/Admin';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Dashboard />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/h-entry" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <HEntry />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/cy-entry" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <CYEntry />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/gp-entry" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <GPEntry />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/patients-h" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <PatientsH />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/patients-cy" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <PatientsCY />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/patients-gp" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <PatientsGP />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/ihc-tests" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <IHCTests />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/excel-upload" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <ExcelUpload />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/statistics" element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Statistics />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <>
              <Navbar />
              <Admin />
            </>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
