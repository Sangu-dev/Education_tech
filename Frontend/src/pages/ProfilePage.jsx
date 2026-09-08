import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Camera, Save, Loader2, Flame, Trophy, Clock,
  BookOpen, User, Mail, Edit3, Shield,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { profileAPI } from '../api/profile.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ProgressBar from '../components/ui/ProgressBar.jsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileAPI.get().then(r => r.data.data.user),
  });

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', bio: profile.bio || '' });
    }
  }, [profile]);



  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: (data) => profileAPI.update(data),
    onSuccess: (res) => {
      updateUser(res.data.data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated!');
      setEditing(false);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const { mutate: uploadAvatar, isPending: uploading } = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return profileAPI.uploadAvatar(formData);
    },
    onSuccess: (res) => {
      updateUser({ avatar: res.data.data.avatar });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Avatar updated!');
    },
    onError: () => toast.error('Failed to upload avatar'),
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
  };

  const displayUser = profile || user;
  const avatarUrl = displayUser?.avatar
    ? (displayUser.avatar.startsWith('http') ? displayUser.avatar : displayUser.avatar)
    : null;
  const streak = displayUser?.streak?.current || 0;
  const bestStreak = displayUser?.streak?.best || 0;
  const learningTime = displayUser?.totalLearningTime || 0;

  const stats = [
    { label: 'Day Streak', value: streak, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Best Streak', value: bestStreak, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Total Minutes', value: learningTime, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Courses', value: displayUser?.enrolledCourses || 0, icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  ];

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white">My Profile</h1>
          <p className="text-slate-400 mt-1">Manage your account and track your learning</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — Avatar + Stats */}
          <div className="space-y-5">
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 text-center"
            >
              <div className="relative inline-block mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-500/30" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-brand flex items-center justify-center ring-4 ring-brand-500/30">
                    <span className="text-white text-3xl font-display font-bold">
                      {displayUser?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  id="upload-avatar-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center shadow-brand-sm transition-colors"
                >
                  {uploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <h2 className="text-white font-display font-bold text-xl">{displayUser?.name}</h2>
              <p className="text-slate-400 text-sm">{displayUser?.email}</p>
              {displayUser?.bio && (
                <p className="text-slate-300 text-sm mt-3 leading-relaxed">{displayUser.bio}</p>
              )}

              <div className="mt-4 pt-4 border-t border-dark-border">
                <span className="badge text-brand-400 bg-brand-400/10">
                  <Shield size={11} /> {displayUser?.role || 'student'}
                </span>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, icon: Icon, color, bg }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 text-center"
                >
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={16} className={color} />
                  </div>
                  <p className="text-white font-bold text-lg">{value}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right — Edit Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Info */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold text-lg">Account Info</h3>
                <button
                  id="edit-profile-btn"
                  onClick={() => setEditing(e => !e)}
                  className="btn-ghost flex items-center gap-1.5 text-sm"
                >
                  <Edit3 size={14} /> {editing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <User size={13} /> Full Name
                  </label>
                  {editing ? (
                    <input
                      id="profile-name"
                      name="name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="input-field"
                      placeholder="Your name"
                    />
                  ) : (
                    <p className="text-white bg-dark-200 rounded-xl px-4 py-3 border border-dark-border">{displayUser?.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} /> Email
                  </label>
                  <p className="text-slate-400 bg-dark-200/50 rounded-xl px-4 py-3 border border-dark-border/50">{displayUser?.email}</p>
                  <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Bio</label>
                  {editing ? (
                    <textarea
                      id="profile-bio"
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="Tell us about yourself…"
                    />
                  ) : (
                    <p className="text-white bg-dark-200 rounded-xl px-4 py-3 border border-dark-border min-h-[80px]">
                      {displayUser?.bio || <span className="text-slate-500">No bio yet</span>}
                    </p>
                  )}
                </div>

                {editing && (
                  <motion.button
                    id="save-profile-btn"
                    onClick={() => saveProfile(form)}
                    disabled={saving}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Learning Progress */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <h3 className="text-white font-semibold text-lg mb-4">Learning Journey</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Daily Learning Goal</span>
                    <span className="text-white font-medium">{Math.min(learningTime, 60)} / 60 min</span>
                  </div>
                  <ProgressBar value={Math.min((learningTime / 60) * 100, 100)} />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'This Week', value: `${Math.round(learningTime * 0.3)}m` },
                    { label: 'This Month', value: `${learningTime}m` },
                    { label: 'All Time', value: `${learningTime}m` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-dark-200 rounded-xl p-3 text-center">
                      <p className="text-white font-bold">{value}</p>
                      <p className="text-slate-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
