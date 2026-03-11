import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3>Loading Application...</h3>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate softly to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If user doesn't have the required role, redirect them somewhere safe
    // For now, redirect to login or a generic unauth page
    return <Navigate softly to="/login" replace />;
  }

  return children;
}
