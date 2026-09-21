import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Menu, Upload, LogOut, User,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { searchAPI } from '../../api/search.js';
import ThemeToggle from '../ui/ThemeToggle.jsx';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchAPI.search(debouncedQuery).then(({ data }) => {
        setSearchResults(data.data);
      }).catch(() => {});
    } else {
      setSearchResults(null);
    }
  }, [debouncedQuery]);

  // Close dropdowns on route change
  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
    setSearchResults(null);
  }, [location.pathname]);

  const avatarUrl = user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : user.avatar)
    : null;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left — Logo + Mobile Menu */}
        <div className="flex items-center gap-3">
          <button
            id="nav-menu-btn"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={20} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              ELearn<span className="text-gradient">AI</span>
            </span>
          </Link>
        </div>

        {/* Center — Search */}
        <div className="relative flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="nav-search"
              type="text"
              placeholder="Search courses, lessons..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            className="w-full rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors input-field"
            />
          </div>
          {/* Search Results */}
          <AnimatePresence>
            {searchOpen && searchResults && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full mt-2 w-full glass-card p-2 z-50"
              >
                {searchResults.courses?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-slate-500 px-3 py-1 font-semibold uppercase tracking-wider">Courses</p>
                    {searchResults.courses.map(c => (
                      <button
                        key={c._id}
                        onClick={() => navigate(`/courses/${c._id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-brand-500/10 transition-colors"
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.lessons?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 px-3 py-1 font-semibold uppercase tracking-wider">Lessons</p>
                    {searchResults.lessons.slice(0, 4).map(l => (
                      <button
                        key={l._id}
                        onClick={() => navigate(`/courses/${l.courseId?._id}/lessons/${l._id}`)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-brand-500/10 transition-colors"
                      >
                        <span className="text-slate-400 text-xs">{l.courseId?.title} ›</span> {l.title}
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.total === 0 && (
                  <p className="text-slate-500 text-sm text-center py-3">No results found</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/upload"
            id="nav-upload-btn"
            className="hidden sm:flex items-center gap-2 btn-primary py-2 px-4 text-sm"
          >
            <Upload size={15} />
            <span>Upload PDF</span>
          </Link>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              id="nav-profile-btn"
              onClick={() => setProfileOpen(p => !p)}
              className="flex items-center gap-2 p-1.5 rounded-xl transition-colors" style={{ '--tw-ring-color': 'var(--border-color)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 glass-card p-2 z-50"
                >
                  <div className="px-3 py-2 mb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                  </div>
                  <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-brand-500/10" style={{ color: 'var(--text-secondary)' }}>
                    <User size={15} /> Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
