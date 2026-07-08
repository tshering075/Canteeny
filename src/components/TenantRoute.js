import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessBlocked from './AccessBlocked';

function TenantRoute({ children }) {
  const { hasActiveAccess } = useAuth();

  if (!hasActiveAccess) {
    return <AccessBlocked />;
  }

  return children;
}

export default TenantRoute;
