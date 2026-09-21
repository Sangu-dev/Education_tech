import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Brain, BookOpen, MessageSquare, Trophy,
  ArrowRight, Sparkles, Check, Zap, Play,
} from 'lucide-react';

const features = [
  { icon: Upload, title: 'Upload Any PDF', desc: 'Simply upload your document and our AI handles the rest. No formatting needed.', color: 'from-violet-500 to-purple-600' },
  { icon: Brain, title: 'AI Course Generation', desc: 'Groq AI analyzes your content and creates structured chapters, lessons, and learning objectives.', color: 'from-blue-500 to-indigo-600' },
  { icon: BookOpen, title: 'Interactive Lessons', desc: 'Beautiful lesson viewer with examples, key takeaways, and important notes.', color: 'from-emerald-500 to-teal-600' },
  { icon: Trophy, title: 'Smart Quizzes', desc: 'AI-generated MCQ, True/False, and short answer questions with detailed explanations.', color: 'from-amber-500 to-orange-600' },
  { icon: MessageSquare, title: 'AI Tutor Chatbot', desc: 'Ask questions about your course. AI retrieves relevant content using RAG to give accurate answers.', color: 'from-rose-500 to-pink-600' },
  { icon: Zap, title: 'Track Progress', desc: 'Resume learning where you left off, track completion, and maintain learning streaks.', color: 'from-cyan-500 to-sky-600' },
];

const stats = [
  { value: '10x', label: 'Faster Learning' },
  { value: 'RAG', label: 'AI Accuracy' },
  { value: '∞', label: 'Courses' },
  { value: '100%', label: 'Free to Start' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-300 text-slate-100 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-dark-border/50 bg-dark-300/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">
              ELearn<span className="text-gradient">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary py-2 px-5 text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8"
          >
            <Sparkles size={14} />
            Powered by Groq AI + RAG Technology
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl lg:text-7xl font-display font-black text-white leading-tight mb-6"
          >
            Transform Any PDF Into<br />
            <span className="text-gradient">Complete E-Learning</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload any PDF document and let AI instantly build a complete course with chapters,
            interactive lessons, quizzes, and a personal AI tutor — all in minutes.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="btn-primary text-lg px-8 py-4 gap-2 flex items-center animate-glow">
              Start Learning Free
              <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="btn-outline text-lg px-8 py-4 gap-2 flex items-center">
              <Play size={18} /> Watch Demo
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-6 mt-10 flex-wrap"
          >
            {['No Credit Card', 'Free Forever', 'AI-Powered'].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-slate-500">
                <Check size={14} className="text-brand-400" /> {item}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Visual — Floating Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative max-w-4xl mx-auto mt-20"
        >
          <div className="glass-card p-6 border-brand-500/20 shadow-brand">
            {/* Mock UI */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1.5">
                {['bg-rose-500', 'bg-yellow-500', 'bg-emerald-500'].map(c => (
                  <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
                ))}
              </div>
              <div className="flex-1 h-6 bg-dark-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Introduction to AI', 'Machine Learning Basics', 'Neural Networks'].map((t, i) => (
                <div key={t} className="bg-dark-200 rounded-xl p-4 border border-dark-border">
                  <div className="w-8 h-8 rounded-lg bg-gradient-brand mb-3 opacity-80" />
                  <p className="text-sm font-medium text-white mb-1">{t}</p>
                  <p className="text-xs text-slate-500">3 lessons • AI Generated</p>
                  <div className="mt-3 bg-dark-300 rounded-full h-1.5">
                    <div className={`h-1.5 bg-gradient-brand rounded-full`} style={{ width: `${[80, 45, 20][i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-dark-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <p className="text-4xl font-display font-black text-gradient mb-1">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-display font-black text-white mb-4"
            >
              Everything You Need to Learn
            </motion.h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              A complete learning ecosystem powered by cutting-edge AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="glass-card p-6 group hover:border-brand-500/30 hover:shadow-brand-sm transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto glass-card p-12 text-center border-brand-500/20 bg-gradient-card relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-indigo-600/5 pointer-events-none" />
          <Sparkles size={40} className="text-brand-400 mx-auto mb-6 relative" />
          <h2 className="text-4xl font-display font-black text-white mb-4 relative">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-slate-400 mb-8 text-lg relative">
            Join thousands of learners who've turned their documents into interactive courses.
          </p>
          <Link to="/register" className="btn-primary text-lg px-10 py-4 gap-2 inline-flex items-center animate-glow relative">
            Create Free Account <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-400" />
            <span className="font-display font-bold text-white">ELearnAI</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} ELearnAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
