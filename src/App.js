import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import supabase from './supabaseClient';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MemberManagement from './pages/MemberManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import Statistics from './pages/Statistics';
import Navbar from './pages/Navbar';
import { useLocation } from 'react-router-dom';
import 'antd/dist/reset.css';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 현재 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // 로딩 상태 표시
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function NavbarWrapper({ children }) {
  const location = useLocation();
  return (
    <>
      {location.pathname !== '/' && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <Router>
      <NavbarWrapper>
        <Routes>
        <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/members" element={
            <ProtectedRoute>
              <MemberManagement />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <AttendanceManagement />
            </ProtectedRoute>
          } />
          <Route path="/statistics" element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          } />
        </Routes>
      </NavbarWrapper>
    </Router>
  );
}

export default App;
