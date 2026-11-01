import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import db from './firebase';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MemberManagement from './pages/MemberManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import Statistics from './pages/Statistics';
import Events from './pages/Events';
import Notice from './pages/Notice';
import TagManagement from './pages/TagManagement';
import Navbar from './pages/Navbar';
import { useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';

const antdTheme = {
  token: {
    colorPrimary: '#2383e2',
    colorText: '#37352f',
    borderRadius: 6,
    fontFamily: '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif',
  },
  components: {
    Table: { headerBg: '#37352f', headerColor: '#ffffff', headerSortActiveBg: '#2f2d29', headerSortHoverBg: '#2f2d29', borderColor: '#e9e9e7', rowHoverBg: '#f7f6f3' },
    Button: { primaryShadow: 'none', defaultShadow: 'none' },
  },
};

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 현재 세션 체크
    db.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변경 구독
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
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
  useEffect(() => {
    document.title = "찬양대 출석부";
  }, []);

  return (
    <ConfigProvider theme={antdTheme}>
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
          <Route path="/events" element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          } />
          <Route path="/notice" element={
            <ProtectedRoute>
              <Notice />
            </ProtectedRoute>
          } />
          <Route path="/tags" element={
            <ProtectedRoute>
              <TagManagement />
            </ProtectedRoute>
          } />
        </Routes>
      </NavbarWrapper>
    </Router>
    </ConfigProvider>
  );
}

export default App;
