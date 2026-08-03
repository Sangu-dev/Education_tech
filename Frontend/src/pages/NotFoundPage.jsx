import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Sparkles } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-300 bg-mesh flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        {/* 404 Visual */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
          className="relative mb-8"
        >
          <p className="text-[120px] md:text-[160px] font-display font-black text-gradient leading-none select-none">
            404
          </p>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/10 blur-3xl rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">ELearnAI</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
            Page not found
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              id="back-home-btn"
              className="btn-primary flex items-center gap-2"
            >
              <Home size={16} /> Back to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
