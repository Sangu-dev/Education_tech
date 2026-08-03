import { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  hint,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
        )}
        <input
          ref={ref}
          type={inputType}
          className={`input-field ${Icon ? 'pl-10' : ''} ${isPassword ? 'pr-11' : ''} ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/40' : ''
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-rose-400 inline-block" />
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
