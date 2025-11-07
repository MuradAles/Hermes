import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/layout/Dashboard';
import './styles/app.css';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Flight Schedule Pro...</p>
      </div>
    );
  }

  if (!user) return <Login />;
  
  return <Dashboard user={user} />;
};

export default App;
