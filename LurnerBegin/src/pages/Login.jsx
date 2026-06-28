import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) navigate('/');
      else setError(result.error || 'Invalid credentials. Please try again.');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f6f8] px-4 py-6">
      <div className="w-full max-w-[400px]">

        {/* Card */}
        <div className="bg-white rounded-[14px] border border-[#e5e7eb] shadow-[0_4px_12px_rgba(17,24,39,0.08)] px-9 pt-10 pb-9">

          {/* Logo mark */}
          <div className="flex justify-center mb-7">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-[#4f6ef7] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-[1.35rem] font-bold text-[#111827] tracking-tight mb-1.5">
              Welcome back
            </h1>
            <p className="text-[#9ca3af] text-sm">
              Sign in to continue your SQL journey.
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="mb-5 px-3.5 py-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-[6px] text-[#dc2626] text-[0.84rem] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3.5">
              <label className="block text-xs font-semibold text-[#4b5563] mb-1.5 tracking-[0.01em]">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#ffffff] border-[1.5px] border-[#e5e7eb] rounded-[6px] px-3.5 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_#eef1fe]"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#4b5563] mb-1.5 tracking-[0.01em]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#ffffff] border-[1.5px] border-[#e5e7eb] rounded-[6px] px-3.5 py-2.5 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] transition-[border-color,box-shadow] duration-150 focus:border-[#4f6ef7] focus:shadow-[0_0_0_3px_#eef1fe]"
              />
            </div>
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-[11px] bg-[#4f6ef7] text-white text-sm font-semibold rounded-[6px] cursor-pointer transition-all duration-150 hover:bg-[#3d5ce6] active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-[15px] h-[15px] border-2 border-white/35 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-5 text-[0.84rem] text-[#4b5563]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#4f6ef7] font-semibold no-underline hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
