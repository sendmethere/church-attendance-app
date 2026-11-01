import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import db from '../firebase';
import logo from '../logo.svg';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200 hide-on-print">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-12">
          <div className="flex">
            <div className="flex-shrink-0 hidden sm:flex items-center">
              <img
                className="h-8 w-auto"
                src={logo}
                alt="Logo"
              />
            </div>
            
            <div className="flex space-x-1 ml-0 sm:ml-6">
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">홈</span>
              </Link>

              <Link
                to="/attendance"
                className={`inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/attendance')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">출석</span>
              </Link>

              <Link
                to="/members"
                className={`inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/members')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">멤버</span>
              </Link>

              <Link
                to="/statistics"
                className={`inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/statistics')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">통계</span>
              </Link>

              <Link
                to="/events"
                className={`hidden sm:inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/events')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">일정</span>
              </Link>
              <Link
                to="/tags"
                className={`hidden sm:inline-flex items-center px-2.5 my-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/tags')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">태그</span>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
