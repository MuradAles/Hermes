import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { TrainingLevel } from '../../types';
import hermesLogo from '../../assets/Hermes.png';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('student-pilot');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName || email.split('@')[0], trainingLevel);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="hermes-logo-wrapper">
            <img src={hermesLogo} alt="Hermes" className="hermes-logo" />
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error">{error}</div>}
          
          {!isLogin && (
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Display Name" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                required 
                className="form-input"
              />
            </div>
          )}
          
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="form-input"
            />
          </div>
          
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Pilot Certification Level</label>
              <select 
                value={trainingLevel} 
                onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)}
                className="form-select"
              >
                <option value="student-pilot">Student Pilot</option>
                <option value="private-pilot">Private Pilot</option>
                <option value="commercial-pilot">Commercial Pilot</option>
                <option value="instrument-rated">Instrument Rated</option>
              </select>
              <p className="form-hint">
                {trainingLevel === 'student-pilot' && 'Clear skies only, 5mi visibility, 3000ft ceiling'}
                {trainingLevel === 'private-pilot' && 'VFR conditions, 4mi visibility, 2500ft ceiling'}
                {trainingLevel === 'commercial-pilot' && 'VFR conditions, 3mi visibility, 1000ft ceiling'}
                {trainingLevel === 'instrument-rated' && 'IFR capable, IMC acceptable'}
              </p>
            </div>
          )}
          
          <button type="submit" className="btn-primary">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <button onClick={handleGoogleSignIn} className="btn-google">
          <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continue with Google
        </button>
        
        <p className="toggle-mode">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span onClick={() => setIsLogin(false)} className="toggle-link">Sign Up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span onClick={() => setIsLogin(true)} className="toggle-link">Sign In</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

