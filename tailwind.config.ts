import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['Untitled Sans', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        light: '400',    // Light becomes Regular
        normal: '500',   // Normal becomes Medium
        medium: '700',   // Medium becomes Bold
        semibold: '700', // Semibold becomes Bold
        bold: '900',     // Bold becomes Black
        black: '900',    // Black stays Black
      },
      gridColumn: {
        'span-1': 'span 1 / span 1',
        'span-2': 'span 2 / span 2',
        'span-3': 'span 3 / span 3',
        'span-4': 'span 4 / span 4',
        'span-5': 'span 5 / span 5',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--tw-prose-body)',
            fontFamily: 'Untitled Sans, system-ui, sans-serif',
            h1: {
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
              fontWeight: '500',
            },
            h2: {
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
              fontWeight: '500',
            },
            h3: {
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
              fontWeight: '500',
            },
            h4: {
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
              fontWeight: '500',
            },
            p: {
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
              fontWeight: '400',
            },
            a: {
              color: 'var(--tw-prose-links)',
              textDecoration: 'underline',
              fontWeight: '500',
              fontFamily: 'Untitled Sans, system-ui, sans-serif',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
        untitled: {
          css: {
            '--tw-prose-body': 'var(--foreground)',
            '--tw-prose-headings': 'var(--foreground)',
            '--tw-prose-links': 'var(--foreground)',
            '--tw-prose-bold': 'var(--foreground)',
            '--tw-prose-counters': 'var(--foreground)',
            '--tw-prose-bullets': 'var(--foreground)',
            '--tw-prose-quotes': 'var(--foreground)',
            '--tw-prose-code': 'var(--foreground)',
            '--tw-prose-hr': 'var(--foreground)',
            '--tw-prose-th-borders': 'var(--foreground)',
            '--tw-prose-td-borders': 'var(--foreground)',
            fontFamily: 'Untitled Sans, system-ui, sans-serif',
            h1: { fontWeight: '500' },
            h2: { fontWeight: '500' },
            h3: { fontWeight: '500' },
            h4: { fontWeight: '500' },
            p: { fontWeight: '400' },
            a: { fontWeight: '500' },
            strong: { fontWeight: '500' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;
