import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SqlExecutionWindow } from './SQLEditor'
import Home from './pages/Home'
import Insights from './pages/Insights'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './components/Layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

/**
 * GuestRoute — Redirects already-authenticated users away from login/register.
 */
function GuestRoute({ children }) {
  // We can't use useAuth here (not inside provider yet), so this is handled
  // inside AuthProvider via the layout's isAuthenticated check.
  // The redirect after login is handled in Login.jsx / Register.jsx.
  return children;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute><Home /></ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute><Insights /></ProtectedRoute>
              } />
              <Route path="/editor/:id" element={
                <ProtectedRoute><SqlExecutionWindow /></ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
