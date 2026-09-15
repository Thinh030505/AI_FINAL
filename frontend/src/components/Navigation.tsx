import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ScanText, LayoutDashboard, History, LogIn, UserPlus, Sparkles, User, LogOut, Scan, Layers, Camera } from 'lucide-react';
import { HealthStatus } from './HealthStatus';
import { useAuth } from '../context/AuthContext';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/camera', label: 'Smart Camera', icon: Camera },
    { path: '/ocr', label: 'OCR Scanner', icon: ScanText },
    { path: '/object-detection', label: 'Object Detection', icon: Scan },
    { path: '/image-analysis', label: 'AI Understanding', icon: Layers },
    { path: '/history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Application Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                AI OCR <span className="text-indigo-400">Hub</span>
              </span>
              <span className="block text-[10px] text-indigo-400 font-mono tracking-wider font-semibold">PHASE 8 SMART CAMERA</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Health Status & User Area */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <HealthStatus />
            </div>

            {/* Auth / User Profile Area */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div className="hidden sm:block text-xs text-left">
                      <div className="font-semibold text-white leading-none">{user.displayName}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">@{user.username}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isActive('/login')
                        ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                        : 'border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Mobile Navigation Tab Bar */}
        <nav className="flex md:hidden items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
