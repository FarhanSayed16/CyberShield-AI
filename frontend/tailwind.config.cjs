/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'safe': '#10B981',
        'low-risk': '#3B82F6',
        'suspicious': '#F59E0B',
        'high-risk': '#EF4444',
        'primary': '#8B5CF6',
        'theme-bg': 'rgb(var(--color-bg) / <alpha-value>)',
        'theme-card': 'rgb(var(--color-card) / <alpha-value>)',
        'theme-border': 'rgb(var(--color-border) / <alpha-value>)',
        'theme-surface': 'rgb(var(--color-surface) / <alpha-value>)',
        'theme-text': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'theme-text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-safe': 'pulse-glow-safe 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-danger': 'pulse-glow-danger 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow-warning': 'pulse-glow-warning 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'laser-scan': 'laserScan 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(139, 92, 246, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' },
        },
        'pulse-glow-safe': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)' },
        },
        'pulse-glow-danger': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(239, 68, 68, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)' },
        },
        'pulse-glow-warning': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245, 158, 11, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)' },
        },
        laserScan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '50%': { transform: 'translateY(200px)' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(400px)', opacity: '0' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
