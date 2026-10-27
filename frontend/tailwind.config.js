/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f3d24',      // Deep forest green for logo background & prominent headers
          DEFAULT: '#166534',   // Primary green (green-800)
          emerald: '#15803d',   // Medium-dark green (green-700)
          light: '#22c55e',     // Bright leaf green (for "Darpan" in logo and badges)
          bg: '#f8faf7',        // Very light soft green-tinted white background
          surface: '#ffffff',   // Pure white card background
          border: '#e2e8f0',
          accent: '#ecfdf5',    // Soft mint background for highlights
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
