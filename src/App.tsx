import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/layout/Dashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import './styles/app.css';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Simple client-side routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Flight Schedule Pro...</p>
      </div>
    );
  }

  // Regular user flow - must be logged in
  if (!user) return <Login />;

  // Admin dashboard route (requires auth)
  if (currentPath === '/admin') {
    return <AdminDashboard />;
  }
  
  return <Dashboard user={user} />;
};

export default App;
