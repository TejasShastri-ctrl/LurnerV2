import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(username, email, password);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)', padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Card */}
        <div style={{
          background: 'var(--bg-content)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          padding: '40px 36px 36px',
        }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{
              fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.01em', marginBottom: 6,
            }}>
              Join Lurner
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Start your journey to SQL mastery today.
            </p>
          </div>

          {/* Error / success alerts */}
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--danger)',
              fontSize: '0.84rem', fontWeight: 500,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--success)',
              fontSize: '0.84rem', fontWeight: 500,
            }}>
              Account created! Redirecting to login…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Username</label>
              <input
                id="reg-username" type="text" required className="input"
                placeholder="johndoe" value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="input-label">Email address</label>
              <input
                id="reg-email" type="email" required className="input"
                placeholder="name@example.com" value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="input-label">Password</label>
              <input
                id="reg-password" type="password" required className="input"
                placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              id="reg-submit" type="submit" disabled={loading || success}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px 20px', fontSize: '0.875rem' }}
            >
              {loading ? <><div className="spinner" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: 22, fontSize: '0.84rem',
            color: 'var(--text-secondary)',
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
