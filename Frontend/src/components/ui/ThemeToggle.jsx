import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button
      id="theme-toggle"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative w-10 h-10 rounded-xl bg-dark-300 border border-dark-border text-slate-400 hover:text-white hover:border-brand-500/50 transition-all flex items-center justify-center"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatedIcon isDark={isDark} />
    </motion.button>
  );
}

function AnimatedIcon({ isDark }) {
  return (
    <motion.div
      key={isDark ? 'moon' : 'sun'}
      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
      animate={{ rotate: 0, opacity: 1, scale: 1 }}
      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.2 }}
    >
      {isDark ? <Moon size={17} /> : <Sun size={17} />}
    </motion.div>
  );
}
