/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  safelist: [
    {
      pattern: /^(btn|nav-li|text-gray_gradient|grid-container|field-input|social-icon|eyebrow|plinth-rule).*$/,
    }
  ],
  theme: {
    extend: {
      fontFamily: {
        generalsans: ['General Sans', 'sans-serif'],
        display: ['Boska', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        black: {
          DEFAULT: '#000',
          100: '#010103',
          200: '#0E0E10',
          300: '#1C1C21',
          500: '#3A3A49',
          600: '#1A1A1A',
        },
        white: {
          DEFAULT: '#FFFFFF',
          800: '#E4E4E6',
          700: '#D6D9E9',
          600: '#AFB0B6',
          500: '#62646C',
        },
        graphite: {
          DEFAULT: '#141417',
          800: '#1B1B1F',
          700: '#26262C',
        },
        stone: '#8E8B84',
        bone: '#E8E5DE',
        gold: {
          DEFAULT: '#C7A44A',
          dim: '#8F7534',
        },
      },
    },
  },
  plugins: [],
}
