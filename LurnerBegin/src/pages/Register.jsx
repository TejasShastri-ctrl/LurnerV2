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

  const inputClass =
    'w-full bg-[var(--color-bg-content)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-light)]';
  const labelClass =
    'block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-[0.01em]';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-app)] px-4 py-6">
      <div className="w-full max-w-[400px]">

        {/* Card */}
        <div className="bg-[var(--color-bg-content)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[0_4px_12px_rgba(17,24,39,0.08)] px-9 pt-10 pb-9">

          {/* Logo mark */}
          <div className="flex justify-center mb-7">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-[1.35rem] font-bold text-[var(--color-text-primary)] tracking-tight mb-1.5">
              Join Lurner
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm">
              Start your journey to SQL mastery today.
            </p>
          </div>

          {/* Error / success alerts */}
          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-[var(--radius-sm)] text-[var(--color-danger)] text-[0.84rem] font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3.5 py-2.5 bg-[var(--color-success-bg)] border border-[var(--color-success-border)] rounded-[var(--radius-sm)] text-[var(--color-success)] text-[0.84rem] font-medium">
              Account created! Redirecting to login…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3.5">
              <label className={labelClass}>Username</label>
              <input
                id="reg-username"
                type="text"
                required
                placeholder="johndoe"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-3.5">
              <label className={labelClass}>Email address</label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-6">
              <label className={labelClass}>Password</label>
              <input
                id="reg-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              id="reg-submit"
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-[11px] bg-[var(--color-accent)] text-white text-sm font-semibold rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 hover:bg-[var(--color-accent-hover)] active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-[15px] h-[15px] border-2 border-white/35 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-5 text-[0.84rem] text-[var(--color-text-secondary)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--color-accent)] font-semibold no-underline hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
