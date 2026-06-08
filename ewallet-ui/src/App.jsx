import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AgentChatProvider } from './context/AgentChatContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Topup from './pages/Topup';
import Transactions from './pages/Transactions';
import SterlingAgent from './pages/SterlingAgent';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <AgentChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/topup" element={<Topup />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/sterling-agent" element={<SterlingAgent />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </AgentChatProvider>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
