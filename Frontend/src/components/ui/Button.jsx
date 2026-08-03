import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-medium px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-50',
};

const sizes = {
  sm: 'text-sm px-4 py-2',
  md: 'px-6 py-3',
  lg: 'text-lg px-8 py-4',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) {
  const baseClass = variants[variant] || variants.primary;
  const sizeClass = size === 'md' ? '' : sizes[size];

  return (
    <motion.button
      whileHover={{ scale: !disabled && !loading ? 1.02 : 1 }}
      whileTap={{ scale: !disabled && !loading ? 0.97 : 1 }}
      disabled={disabled || loading}
      className={`${baseClass} ${sizeClass} inline-flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </motion.button>
  );
}
