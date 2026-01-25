module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        'blue-500': '#3b82f6',
        'blue-600': '#2563eb',
        'blue-700': '#1d4ed8',
        'blue-800': '#1e40af',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#374151',
            a: {
              color: '#2563eb',
              '&:hover': {
                color: '#1d4ed8',
              },
            },
          },
        },
      },
    },
  },
  plugins: [],
};