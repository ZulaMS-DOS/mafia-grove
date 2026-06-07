/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        grove: {
          green:  '#00ff66',
          dark:   '#00cc52',
          dim:    '#00ff6620',
          border: '#00ff6630',
        },
        dark: {
          bg:     '#000000',
          card:   '#0a0a0a',
          border: '#1a1a1a',
          hover:  '#111111',
          muted:  '#2a2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in':    'fade-in 0.3s ease-out',
        'slide-up':   'slide-up 0.4s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 5px #00ff6640' },
          '50%':     { boxShadow: '0 0 20px #00ff6680' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
