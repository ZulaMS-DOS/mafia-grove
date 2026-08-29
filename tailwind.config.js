/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'dark-bg':     '#09090b',
        'dark-card':   '#111111',
        'dark-hover':  '#18181b',
        'dark-border': '#27272a',
        'dark-muted':  '#1f1f1f',

        'grove-green': '#fafafa',
        'grove-dark':  '#d4d4d8',

        'grove-dim':   'rgba(255,255,255,0.06)',
        'grove-border':'rgba(255,255,255,0.12)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },

        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
