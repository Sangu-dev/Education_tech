import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, BookOpen, Zap, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const floatingItems = [
  { icon: BookOpen, label: 'Smart Lessons', color: 'text-violet-400', bg: 'bg-violet-500/10', delay: 0 },
  { icon: Brain, label: 'AI Tutor', color: 'text-indigo-400', bg: 'bg-indigo-500/10', delay: 0.2 },
  { icon: Zap, label: 'Fast Learning', color: 'text-purple-400', bg: 'bg-purple-500/10', delay: 0.4 },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      await login(form);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-300">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-brand relative overflow-hidden p-12">
        {/* Background mesh */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0, transparent 50%)' }} />
        
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 relative z-10"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">ELearnAI</span>
        </motion.div>

        {/* Center content */}
        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-display font-bold text-white leading-tight mb-4"
          >
            Learn smarter,<br />not harder.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg mb-10"
          >
            Upload any PDF and let AI create personalized lessons, quizzes, and a 24/7 tutor.
          </motion.p>

          {/* Feature pills */}
          <div className="space-y-3">
            {floatingItems.map(({ icon: Icon, label, delay }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + delay }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 w-fit"
              >
                <Icon size={18} className="text-white" />
                <span className="text-white font-medium text-sm">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/40 text-sm relative z-10"
        >
          © 2025 ELearnAI. All rights reserved.
        </motion.p>
      </div>

      {/* Right — Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Sparkles size={17} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">
              ELearn<span className="text-gradient">AI</span>
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 mb-8">Sign in to continue your learning journey</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <motion.button
              id="login-submit"
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-dark-border" />
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-dark-border" />
          </div>

          <p className="text-center text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 font-semibold hover:text-brand-300 transition-colors">
              Create one free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
