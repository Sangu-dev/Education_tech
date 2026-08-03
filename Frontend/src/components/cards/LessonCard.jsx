import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';

export default function LessonCard({ lesson, courseId, completed, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group
        ${completed
          ? 'border-brand-500/20 bg-brand-500/5'
          : 'border-dark-border bg-dark-card/50 hover:border-brand-500/30 hover:bg-brand-500/5'
        }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        completed ? 'bg-brand-500/20' : 'bg-dark-200'
      }`}>
        {completed
          ? <CheckCircle2 size={18} className="text-brand-400" />
          : <BookOpen size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${completed ? 'text-brand-300' : 'text-slate-200'}`}>
          {lesson.title}
        </p>
        {lesson.estimatedTime && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Clock size={10} /> {lesson.estimatedTime} min
          </p>
        )}
      </div>

      {/* Action */}
      <Link
        to={`/courses/${courseId}/lessons/${lesson._id}`}
        className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
      >
        <ArrowRight size={15} />
      </Link>
    </motion.div>
  );
}
