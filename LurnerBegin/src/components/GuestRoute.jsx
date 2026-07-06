import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * GuestRoute — Redirects already-authenticated users away from login/register.
 * Shows a loading spinner while the auth state is being restored.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg-app)]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
