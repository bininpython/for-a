import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        hpe: {
          black: '#050505',
          'black-2': '#101010',
          gray: '#1A1A1A',
          orange: '#FF6500',
          'orange-2': '#FF8500',
          white: '#FFFFFF',
          muted: '#A0A0A0',
        },
        border: 'rgba(255,255,255,0.08)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-inter)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(255,101,0,0.35), 0 12px 48px -12px rgba(255,101,0,0.45)',
      },
      backgroundImage: {
        'hpe-radial':
          'radial-gradient(120% 90% at 50% -10%, rgba(255,101,0,0.16) 0%, rgba(5,5,5,0) 60%)',
        'hpe-grid':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(255,101,0,0.35)' },
          '100%': { boxShadow: '0 0 0 14px rgba(255,101,0,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
      transitionTimingFunction: {
        hpe: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
