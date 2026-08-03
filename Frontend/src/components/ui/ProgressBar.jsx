import { motion } from 'framer-motion';

export default function ProgressBar({
  value = 0,
  max = 100,
  showLabel = true,
  size = 'md',
  color = 'brand',
  label,
  className = '',
}) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  const colors = {
    brand: 'bg-gradient-brand',
    green: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    yellow: 'bg-gradient-to-r from-yellow-500 to-amber-400',
    red: 'bg-gradient-to-r from-rose-500 to-pink-400',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
          {showLabel && (
            <span className="text-xs font-bold text-brand-400 ml-auto">{percentage}%</span>
          )}
        </div>
      )}
      <div className={`progress-bar-track ${heights[size]}`}>
        <motion.div
          className={`${heights[size]} ${colors[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
