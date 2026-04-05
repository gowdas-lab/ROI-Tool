import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  
  const { login, signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    let success;
    if (isLogin) {
      success = await login(formData.email, formData.password);
    } else {
      success = await signup({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name || undefined
      });
    }

    if (success) {
      navigate('/');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    fontSize: '14px',
    marginBottom: '16px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#8b949e',
    textTransform: 'uppercase' as const,
    marginBottom: '6px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    background: '#238636',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '12px',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/assets/elektron-logo.png" 
            alt="Elektron" 
            style={{
              width: '120px',
              height: 'auto',
              margin: '0 auto 16px',
              display: 'block'
            }}
          />
          <h1 style={{ fontSize: '24px', color: '#c9d1d9', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ fontSize: '14px', color: '#8b949e' }}>
            {isLogin ? 'Sign in to your account' : 'Sign up to get started'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(218, 54, 51, 0.1)',
            border: '1px solid rgba(218, 54, 51, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            color: '#f85149',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              style={inputStyle}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label style={labelStyle}>Username</label>
                <input
                  type="text"
                  required
                  style={inputStyle}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>
              <div>
                <label style={labelStyle}>Full Name (Optional)</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              style={inputStyle}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
            />
          </div>

          {!isLogin && (
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type="password"
                required
                style={inputStyle}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm password"
              />
            </div>
          )}

          <button type="submit" disabled={isLoading} style={buttonStyle}>
            {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span style={{ color: '#8b949e', fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              clearError();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#58a6ff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
