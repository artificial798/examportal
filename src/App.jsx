import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Components
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import StudentDashboard from './pages/Student/StudentDashboard';
import ExamRoom from './pages/Student/ExamRoom';
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import SchoolAdminDashboard from './pages/SchoolAdmin/SchoolAdminDashboard';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/superadmin/*" element={
            <PrivateRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </PrivateRoute>
          } />

          <Route path="/schooladmin/*" element={
            <PrivateRoute allowedRoles={['school_admin']}>
              <SchoolAdminDashboard />
            </PrivateRoute>
          } />

          <Route path="/teacher/*" element={
            <PrivateRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </PrivateRoute>
          } />

          <Route path="/student" element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } />

          <Route path="/student/exam/:examId" element={
            <PrivateRoute allowedRoles={['student']}>
              <ExamRoom />
            </PrivateRoute>
          } />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
