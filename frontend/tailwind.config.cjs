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
        'primary': '#2563EB',
        'primary-hover': '#1D4ED8',
        'theme-bg': 'rgb(var(--color-bg) / <alpha-value>)',
        'theme-card': 'rgb(var(--color-card) / <alpha-value>)',
        'theme-border': 'rgb(var(--color-border) / <alpha-value>)',
        'theme-surface': 'rgb(var(--color-surface) / <alpha-value>)',
        'theme-text': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'theme-text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        signal: {
          DEFAULT: '#0F766E',
          bright: '#14B8A6',
          soft: '#CCFBF1',
          ink: '#134E4A',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'laser-scan': 'laserScan 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(37, 99, 235, 0.2)' },
          '50%': { boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)' },
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
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        }
      },
    },
  },
  plugins: [],
}
