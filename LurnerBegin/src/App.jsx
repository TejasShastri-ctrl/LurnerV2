import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SqlExecutionWindow } from './SQLEditor'
import Home from './pages/Home'
import Insights from './pages/Insights'
import Login from './pages/Login'
import Register from './pages/Register'
import AppLayout from './components/Layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import Admin from './pages/Admin'
import Contests from './pages/Contests'
import ContestWorkspace from './pages/ContestWorkspace'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

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
              <Route path="/admin" element={
                <ProtectedRoute><Admin /></ProtectedRoute>
              } />
              <Route path="/contests" element={
                <ProtectedRoute><Contests /></ProtectedRoute>
              } />
              <Route path="/editor/contest/:contestId" element={
                <ProtectedRoute><ContestWorkspace /></ProtectedRoute>
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
