module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'sphaire-black': '#0A0A10',
        'sphaire-dark': '#13131f',
        'sphaire-purple': '#4B0082',
        'sphaire-purple-light': '#6A5ACD',
        'sphaire-pink': '#FF1493',
        'sphaire-pink-light': '#FF69B4',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 20, 147, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 20, 147, 0.8), 0 0 30px rgba(106, 90, 205, 0.6)' },
        },
      },
      boxShadow: {
        'neon': '0 0 10px rgba(255, 20, 147, 0.7), 0 0 20px rgba(106, 90, 205, 0.5)',
        'neon-strong': '0 0 15px rgba(255, 20, 147, 0.8), 0 0 30px rgba(106, 90, 205, 0.6)',
        'purple-glow': '0 0 15px rgba(106, 90, 205, 0.8)',
        'pink-glow': '0 0 15px rgba(255, 20, 147, 0.8)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
