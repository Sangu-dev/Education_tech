import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Palette, Trash2, Eye, EyeOff,
  Save, Loader2, ChevronRight, AlertTriangle, Moon, Sun,
  Shield,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { profileAPI } from '../api/profile.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: (data) => profileAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to change password'),
  });

  const { mutate: deleteAccount, isPending: deleting } = useMutation({
    mutationFn: () => profileAPI.deleteAccount(),
    onSuccess: () => {
      toast.success('Account deleted');
      logout();
    },
    onError: () => toast.error('Failed to delete account'),
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    if (passwordForm.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    });
  };

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account preferences</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tab List */}
          <nav className="md:w-52 shrink-0">
            <div className="glass-card p-2 space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`settings-tab-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${activeTab === id
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                      : 'text-slate-400 hover:bg-dark-border hover:text-slate-200'
                    }
                    ${id === 'danger' ? (activeTab === id ? '' : 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10') : ''}
                  `}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {/* ─── Account Tab ─── */}
              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="glass-card p-6"
                >
                  <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                    <User size={18} className="text-brand-400" /> Account Details
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Name</label>
                      <p className="input-field cursor-default opacity-70">{user?.name}</p>
                      <p className="text-xs text-slate-600 mt-1">Change name from the Profile page</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                      <p className="input-field cursor-default opacity-70">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Role</label>
                      <div className="flex items-center gap-2 bg-dark-200 rounded-xl px-4 py-3 border border-dark-border w-fit">
                        <Shield size={14} className="text-brand-400" />
                        <span className="text-white font-medium capitalize">{user?.role || 'student'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Security Tab ─── */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="glass-card p-6"
                >
                  <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                    <Lock size={18} className="text-brand-400" /> Change Password
                  </h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          id="current-password"
                          type={showPass ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                          className="input-field pr-12"
                          placeholder="Enter current password"
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">New Password</label>
                      <input
                        id="new-password"
                        type={showPass ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                        className="input-field"
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Confirm New Password</label>
                      <input
                        id="confirm-new-password"
                        type={showPass ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        className={`input-field ${passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? 'border-red-500/50' : ''}`}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      id="change-password-btn"
                      type="submit"
                      disabled={changingPw}
                      className="btn-primary flex items-center gap-2"
                    >
                      {changingPw ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Update Password
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ─── Appearance Tab ─── */}
              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="glass-card p-6"
                >
                  <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                    <Palette size={18} className="text-brand-400" /> Appearance
                  </h2>
                  <div>
                    <p className="text-sm text-slate-400 mb-3">Theme</p>
                    <div className="flex gap-3">
                      <button
                        id="theme-dark-btn"
                        onClick={() => isDark ? null : toggleTheme()}
                        className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border transition-all
                          ${isDark ? 'border-brand-500 bg-brand-500/10' : 'border-dark-border hover:border-brand-500/40'}`}
                      >
                        <Moon size={24} className="text-brand-400" />
                        <span className="text-white text-sm font-medium">Dark</span>
                        {isDark && (
                          <span className="text-xs text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </button>
                      <button
                        id="theme-light-btn"
                        onClick={() => !isDark ? null : toggleTheme()}
                        className={`flex-1 flex flex-col items-center gap-3 p-5 rounded-xl border transition-all
                          ${!isDark ? 'border-brand-500 bg-brand-500/10' : 'border-dark-border hover:border-brand-500/40'}`}
                      >
                        <Sun size={24} className="text-yellow-400" />
                        <span className="text-white text-sm font-medium">Light</span>
                        {!isDark && (
                          <span className="text-xs text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Danger Zone Tab ─── */}
              {activeTab === 'danger' && (
                <motion.div
                  key="danger"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="glass-card p-6 border-red-500/20"
                >
                  <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-400" /> Danger Zone
                  </h2>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold">Delete Account</p>
                        <p className="text-slate-400 text-sm mt-0.5">
                          Permanently delete your account and all data. This cannot be undone.
                        </p>
                      </div>
                      <button
                        id="delete-account-btn"
                        onClick={() => setShowDeleteDialog(true)}
                        className="shrink-0 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
                      >
                        <Trash2 size={15} /> Delete Account
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => { deleteAccount(); setShowDeleteDialog(false); }}
        title="Delete Account"
        message="This will permanently delete your account, all courses, and progress. This action cannot be undone."
        confirmText="Delete Forever"
        variant="danger"
      />
    </DashboardLayout>
  );
}
