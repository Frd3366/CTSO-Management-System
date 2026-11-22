/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFFDEB',
          100: '#FFF8C4',
          200: '#FFF18D',
          300: '#FFE956',
          400: '#FFE160', // Light accent yellow
          500: '#FFD416', // Primary golden yellow
          600: '#E5BD00',
          700: '#BF9C00',
          800: '#8C7200',
          900: '#5E4C00',
          DEFAULT: '#FFD416',
        },
        brand: {
          yellow: '#FFD416',
          yellowLight: '#FFE160',
          dark: '#202020',
          light: '#F4F4F4',
          white: '#FFFFFF',
          surface: '#FFFFFF',
          text: '#202020',
          textLight: '#F4F4F4',
          textSecondary: '#647084',
          border: '#E2E8F0',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          input: '#F4F4F4',
          subtle: '#F4F4F4',
          dark: '#202020',
          darkElevated: '#282828',
        },
        content: {
          heading: '#202020',
          body: '#202020',
          secondary: '#647084',
          light: '#F4F4F4',
        },
        border: {
          DEFAULT: '#E2E8F0',
          subtle: '#F1F4F9',
          input: '#CBD5E1',
          dark: '#262626',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'clean-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'clean-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.02)',
        'clean-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'topbar': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 4px 12px 0 rgba(0, 0, 0, 0.02)',
        'gx': '0 2px 8px -2px rgba(249, 201, 0, 0.4)',
      },
      borderRadius: {
        'xl': '0.75rem',  // 12px
        '2xl': '1rem',    // 16px
        '3xl': '1.5rem',  // 24px
      }
    },
  },
  plugins: [],
}
