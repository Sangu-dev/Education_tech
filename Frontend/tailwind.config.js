/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        dark: {
          50:  '#f8fafc',
          100: '#1e1b2e',
          200: '#16131f',
          300: '#0f0d18',
          400: '#0a0812',
          card: '#1a1728',
          border: '#2d2b3d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1e1b2e 0%, #0f0d18 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.05) 100%)',
      },
      boxShadow: {
        'brand': '0 0 30px rgba(139, 92, 246, 0.3)',
        'brand-sm': '0 0 15px rgba(139, 92, 246, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-brand': 'pulseBrand 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(139,92,246,0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
