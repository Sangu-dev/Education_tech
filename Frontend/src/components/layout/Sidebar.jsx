import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Upload, BookOpen, MessageSquare,
  User, Settings, X, Sparkles, TrendingUp,
  Trophy, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const navLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload PDF' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand-sm">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white">
              ELearn<span className="text-gradient">AI</span>
            </span>
            <p className="text-xs text-slate-500">AI Learning Platform</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-border transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest px-4 mb-3">
          Navigation
        </p>
        {navLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="glass-card p-4 bg-gradient-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <TrendingUp size={13} className="text-brand-400 mx-auto mb-0.5" />
              <p className="text-xs text-white font-bold">{user?.streak?.current || 0}</p>
              <p className="text-[10px] text-slate-500">Streak</p>
            </div>
            <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <Trophy size={13} className="text-yellow-400 mx-auto mb-0.5" />
              <p className="text-xs text-white font-bold">0</p>
              <p className="text-[10px] text-slate-500">Quizzes</p>
            </div>
            <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <Clock size={13} className="text-blue-400 mx-auto mb-0.5" />
              <p className="text-xs text-white font-bold">{user?.totalLearningTime || 0}m</p>
              <p className="text-[10px] text-slate-500">Time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50 overflow-hidden" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
