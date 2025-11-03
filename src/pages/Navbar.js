import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import logo from '../logo.svg';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <nav className="bg-white shadow-md hide-on-print">
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
            
            <div className="flex space-x-8 ml-0 sm:ml-8">
              <Link
                to="/attendance"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/attendance')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">출석</span>
              </Link>

              <Link
                to="/members"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/members')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">멤버</span>
              </Link>

              <Link
                to="/statistics"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/statistics')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">통계</span>
              </Link>

              <Link
                to="/events"
                className={`hidden sm:inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/events')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">일정</span>
              </Link>
              <Link
                to="/notice"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/notice')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className="text-xs">공지</span>
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
