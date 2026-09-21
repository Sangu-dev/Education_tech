import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, TrendingUp, Upload,
  ChevronRight, Flame, Zap, Star, ArrowRight,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { progressAPI } from '../api/progress.js';
import { coursesAPI } from '../api/courses.js';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { SkeletonCard, SkeletonList } from '../components/ui/SkeletonLoader.jsx';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => progressAPI.getAll().then(r => r.data.data.progress),
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll().then(r => r.data.courses || r.data.data?.courses || r.data?.data?.courses || []),
  });


  const isLoading = progressLoading || coursesLoading;

  // Compute stats
  const totalCourses = courses?.length || 0;
  const streak = user?.streak?.current || 0;
  const learningTime = user?.totalLearningTime || 0;
  const completedLessons = progressData?.reduce((sum, c) => sum + (c.progress?.completedLessons || 0), 0) || 0;

  // In-progress courses (progress > 0 and < 100)
  const inProgress = progressData?.filter(c => {
    const pct = c.progress?.percentage || 0;
    return pct > 0 && pct < 100;
  }) || [];

  const stats = [
    { label: 'Courses', value: totalCourses, icon: BookOpen, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Lessons Done', value: completedLessons, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Day Streak', value: streak, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Mins Learned', value: learningTime, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold text-white">
            Good day, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1">Here's your learning overview for today</p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <motion.div key={label} variants={item} className="stat-card">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-display font-bold text-white">{value}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Continue Learning */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Continue Learning</h2>
              <Link to="/upload" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                <Upload size={14} /> Upload PDF
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : inProgress.length > 0 ? (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {inProgress.slice(0, 5).map(course => (
                  <motion.div key={course._id} variants={item}>
                    <Link
                      to={`/courses/${course._id}`}
                      className="glass-card p-5 flex items-center gap-4 hover:border-brand-500/30 transition-all duration-200 group block"
                    >
                      {/* Color accent */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shrink-0">
                        <BookOpen size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate group-hover:text-brand-300 transition-colors">
                          {course.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <ProgressBar value={course.progress?.percentage || 0} className="flex-1" />
                          <span className="text-xs text-slate-400 shrink-0">
                            {course.progress?.percentage || 0}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {course.progress?.completedLessons || 0} / {course.progress?.totalLessons || 0} lessons
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-brand-400 transition-colors shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-10 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                  <Zap size={28} className="text-brand-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">No courses yet</h3>
                <p className="text-slate-400 text-sm mb-6">Upload a PDF to generate your first AI-powered course</p>
                <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
                  <Upload size={16} /> Upload Your First PDF
                </Link>
              </motion.div>
            )}
          </div>

          {/* All Courses / Right Panel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title text-xl">All Courses</h2>
            </div>

            {isLoading ? (
              <SkeletonList count={4} />
            ) : courses?.length > 0 ? (
              <div className="space-y-2">
                {courses.map(course => {
                  const prog = progressData?.find(p => p._id === course._id);
                  const pct = prog?.progress?.percentage || 0;
                  const statusColor = course.status === 'ready'
                    ? 'text-green-400 bg-green-400/10'
                    : course.status === 'processing'
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-slate-400 bg-slate-400/10';

                  return (
                    <Link
                      key={course._id}
                      to={`/courses/${course._id}`}
                      className="glass-card p-4 flex items-center gap-3 hover:border-brand-500/30 transition-all group block"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-brand/20 flex items-center justify-center shrink-0 border border-brand-500/20">
                        <BookOpen size={16} className="text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-brand-300 transition-colors">
                          {course.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                            {course.status}
                          </span>
                          {pct > 0 && <span className="text-xs text-slate-500">{pct}%</span>}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-brand-400 shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-6 text-center">
                <p className="text-slate-400 text-sm">No courses yet</p>
              </div>
            )}

            {/* Quick actions */}
            <div className="mt-4 glass-card p-4 bg-gradient-card">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-3">Quick Actions</p>
              <Link to="/upload" className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-500/10 transition-colors group">
                <Upload size={16} className="text-brand-400" />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Upload New PDF</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-500/10 transition-colors group">
                <TrendingUp size={16} className="text-green-400" />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">View Progress</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
