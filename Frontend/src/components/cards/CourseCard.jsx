import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar.jsx';

const difficultyColors = {
  Beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Advanced: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const statusColors = {
  processing: 'bg-blue-500/10 text-blue-400',
  ready: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-rose-500/10 text-rose-400',
};

export default function CourseCard({ course, progress, onDelete, index = 0 }) {
  const isProcessing = course.status === 'processing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="glass-card group hover:border-brand-500/30 hover:shadow-brand-sm transition-all duration-300"
    >
      {/* Thumbnail / Header */}
      <div className="h-32 bg-gradient-card rounded-t-2xl flex items-center justify-center relative overflow-hidden border-b border-dark-border">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-indigo-600/10" />
        <BookOpen size={40} className="text-brand-400/60 relative z-10" />
        {/* Status badge */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${statusColors[course.status]}`}>
          {isProcessing && <Loader2 size={10} className="inline animate-spin mr-1" />}
          {course.status === 'processing' ? 'Generating...' : course.status === 'failed' ? 'Failed' : 'Ready'}
        </div>
        {/* Difficulty */}
        {course.difficulty && (
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-semibold border ${difficultyColors[course.difficulty] || 'bg-slate-500/10 text-slate-400'}`}>
            {course.difficulty}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-white text-base leading-tight mb-1.5 line-clamp-2 group-hover:text-brand-300 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
          {course.description || 'Generating course content...'}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1">
            <BookOpen size={11} /> {course.totalLessons || 0} lessons
          </span>
          {course.estimatedTime && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {course.estimatedTime}
            </span>
          )}
        </div>

        {/* Progress */}
        {progress && course.status === 'ready' && (
          <div className="mb-4">
            <ProgressBar value={progress.percentage} size="sm" showLabel />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {course.status === 'ready' ? (
            <Link
              to={`/courses/${course._id}`}
              className="flex-1 flex items-center justify-center gap-1.5 btn-primary py-2 text-sm"
            >
              {progress?.percentage > 0 ? 'Continue' : 'Start'} Learning
              <ArrowRight size={14} />
            </Link>
          ) : isProcessing ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 text-sm text-slate-400 py-2">
              <Loader2 size={14} className="animate-spin" /> Generating course...
            </div>
          ) : (
            <div className="flex-1 text-center text-sm text-rose-400 py-2">Generation failed</div>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(course._id)}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete course"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
