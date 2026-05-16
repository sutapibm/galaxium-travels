/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#030712',
        'space-blue': '#0A1929',
        'cosmic-purple': '#6366F1',
        'nebula-pink': '#EC4899',
        'alien-green': '#10B981',
        'solar-orange': '#F59E0B',
        'star-white': '#F9FAFB',
        'premium-gold': '#FCD34D',
        'premium-silver': '#E5E7EB',
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(to bottom, #030712, #0A1929)',
        'cosmic-gradient': 'linear-gradient(135deg, #6366F1, #EC4899)',
        'galaxium-gradient': 'linear-gradient(135deg, #10B981, #34D399, #6EE7B7)',
        'premium-gradient': 'linear-gradient(135deg, #FCD34D, #F59E0B)',
        'business-gradient': 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)',
            transform: 'scale(1.02)',
          },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundSize: {
        '200%': '200% 200%',
      },
    },
  },
  plugins: [],
}

// Made with Bob
