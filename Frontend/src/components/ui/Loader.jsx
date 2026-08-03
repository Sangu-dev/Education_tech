import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function Loader({ size = 'md', text = 'Loading...' }) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className={`${sizes[size]} rounded-full border-2 border-transparent border-t-brand-500 border-r-brand-400`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={size === 'sm' ? 10 : size === 'lg' ? 20 : 14} className="text-brand-400" />
        </div>
      </div>
      {text && <p className="text-sm text-slate-400 animate-pulse">{text}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-dark-300/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <Loader size="lg" text="Preparing your experience..." />
    </div>
  );
}

export function InlineLoader({ text }) {
  return (
    <div className="flex items-center gap-3 py-4 justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-5 h-5 rounded-full border-2 border-transparent border-t-brand-500"
      />
      {text && <span className="text-sm text-slate-400">{text}</span>}
    </div>
  );
}
